const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

// Ensure local backup fallback directory exists
const localBackupDir = path.join(__dirname, '../uploads/db_backups');
if (!fs.existsSync(localBackupDir)) {
  fs.mkdirSync(localBackupDir, { recursive: true });
}

// Target Firebase Storage bucket configuration
const DEFAULT_PROJECT_ID = process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT || 'godofmobil';
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || process.env.FIREBASE_STORAGE_BUCKET || process.env.DB_FIREBASE_STORAGE_BUCKET || `${DEFAULT_PROJECT_ID}.firebasestorage.app`;

let bucket = null;

function getStorageBucket() {
  if (bucket) return bucket;

  try {
    const apps = admin.getApps ? admin.getApps() : (admin.apps || []);
    if (apps.length === 0) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      // Candidate paths for auto-detecting serviceAccountKey.json
      const candidatePaths = [
        serviceAccountPath,
        path.join(__dirname, '../serviceAccountKey.json'),
        path.join(__dirname, '../../serviceAccountKey.json'),
        path.join(process.cwd(), 'serviceAccountKey.json'),
        path.join(process.cwd(), '../serviceAccountKey.json')
      ].filter(Boolean);

      const foundKeyPath = candidatePaths.find(p => fs.existsSync(p));

      if (serviceAccountJson) {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: BUCKET_NAME
        });
        console.log(`[StorageService] Authenticated using FIREBASE_SERVICE_ACCOUNT_JSON env variable.`);
      } else if (foundKeyPath) {
        const serviceAccount = require(path.resolve(foundKeyPath));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: BUCKET_NAME
        });
        console.log(`[StorageService] Authenticated using Service Account Key: ${foundKeyPath}`);
      } else {
        admin.initializeApp({
          projectId: DEFAULT_PROJECT_ID,
          storageBucket: BUCKET_NAME
        });
        console.log(`[StorageService] Initialized default Firebase app (Project: ${DEFAULT_PROJECT_ID}, Bucket: ${BUCKET_NAME})`);
      }
    }

    bucket = getStorage().bucket(BUCKET_NAME);
    return bucket;
  } catch (e) {
    console.warn('[StorageService] Firebase Storage bucket initialization notice:', e.message);
    return null;
  }
}

/**
 * Get active Firebase CLI OAuth access token from local configstore
 */
function getCliAccessToken() {
  try {
    const configPath = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (data && data.tokens && data.tokens.access_token) {
        return data.tokens.access_token;
      }
    }
  } catch (e) {
    // Ignore error
  }
  return null;
}

/**
 * Force refresh CLI token if expired
 */
function refreshCliToken() {
  try {
    execSync('npx firebase-tools projects:list', { stdio: 'ignore' });
    return getCliAccessToken();
  } catch (e) {
    return getCliAccessToken();
  }
}

class StorageService {
  /**
   * Upload database snapshot ZIP file to Firebase Storage under `db_backups/` and local fallback
   */
  async uploadFile(filename, buffer) {
    const storagePath = `db_backups/${filename}`;
    const localFilePath = path.join(localBackupDir, filename);

    // Try Firebase Storage upload first (Admin SDK or CLI OAuth REST API)
    let uploadedToFirebase = false;
    const b = getStorageBucket();

    if (b) {
      try {
        const file = b.file(storagePath);
        await file.save(buffer, {
          resumable: false,
          metadata: {
            contentType: 'application/zip',
            metadata: {
              createdAt: new Date().toISOString(),
              source: 'database_backup_system'
            }
          }
        });
        uploadedToFirebase = true;
        console.log(`[StorageService] Successfully uploaded backup snapshot exclusively to Firebase Storage (${BUCKET_NAME}): ${storagePath}`);
      } catch (err) {
        // Fallback to Firebase CLI OAuth token REST API if Admin SDK credentials are uninitialized locally
        let token = getCliAccessToken();
        if (token) {
          try {
            let url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;
            let res = await fetch(url, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/zip'
              },
              body: buffer
            });

            if (res.status === 401) {
              token = refreshCliToken();
              res = await fetch(url, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/zip'
                },
                body: buffer
              });
            }

            if (res.ok) {
              uploadedToFirebase = true;
              console.log(`[StorageService] Successfully uploaded backup snapshot exclusively to Firebase Storage via CLI OAuth (${BUCKET_NAME}): ${storagePath}`);
            } else {
              const text = await res.text();
              console.warn(`[StorageService] Firebase CLI REST upload notice (${res.status} ${text}).`);
            }
          } catch (restErr) {
            console.warn(`[StorageService] Firebase Storage upload notice: ${restErr.message}.`);
          }
        } else {
          console.warn(`[StorageService] Firebase Storage upload notice: ${err.message}.`);
        }
      }
    }

    // Clean up local copy if Firebase Storage upload succeeded
    if (uploadedToFirebase) {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (e) { }
      }
      return {
        storagePath,
        localPath: null,
        uploadedToFirebase: true
      };
    } else {
      // Emergency local fallback only if Firebase Storage is completely unreachable
      fs.writeFileSync(localFilePath, buffer);
      return {
        storagePath,
        localPath: localFilePath,
        uploadedToFirebase: false
      };
    }
  }

  /**
   * Download file buffer from Firebase Storage (or local fallback)
   */
  async downloadFile(storagePath) {
    const filename = path.basename(storagePath);
    const localFilePath = path.join(localBackupDir, filename);

    // 1. Check Firebase Storage via Admin SDK
    const b = getStorageBucket();
    if (b) {
      try {
        const targetPath = storagePath.startsWith('db_backups/') ? storagePath : `db_backups/${filename}`;
        const file = b.file(targetPath);
        const [exists] = await file.exists();
        if (exists) {
          const [buffer] = await file.download();
          return buffer;
        }
      } catch (err) {
        // Fallback to CLI OAuth REST API
        let token = getCliAccessToken();
        if (token) {
          try {
            const targetPath = storagePath.startsWith('db_backups/') ? storagePath : `db_backups/${filename}`;
            let url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(targetPath)}?alt=media`;
            let res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
              token = refreshCliToken();
              res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
              });
            }
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              const buffer = Buffer.from(arrayBuf);
              console.log(`[StorageService] Downloaded backup file from Firebase Storage via CLI OAuth: ${storagePath}`);
              return buffer;
            }
          } catch (restErr) {
            console.warn(`[StorageService] CLI REST download notice: ${restErr.message}`);
          }
        }
      }
    }

    // 2. Check local fallback file
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }

    throw new Error(`Backup file unavailable in Firebase Storage (${storagePath})`);
  }

  /**
   * Delete file from Firebase Storage and local fallback
   */
  async deleteFile(storagePath) {
    const filename = path.basename(storagePath);
    const localFilePath = path.join(localBackupDir, filename);

    if (fs.existsSync(localFilePath)) {
      try { fs.unlinkSync(localFilePath); } catch (e) { }
    }

    const b = getStorageBucket();
    if (b) {
      const targetPath = storagePath.startsWith('db_backups/') ? storagePath : `db_backups/${filename}`;
      try {
        const file = b.file(targetPath);
        await file.delete({ ignoreNotFound: true });
        console.log(`[StorageService] Deleted ${targetPath} from Firebase Storage (${BUCKET_NAME})`);
      } catch (err) {
        let token = getCliAccessToken();
        if (token) {
          try {
            let url = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o/${encodeURIComponent(targetPath)}`;
            let res = await fetch(url, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.status === 401) {
              token = refreshCliToken();
              res = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
            if (res.ok || res.status === 404) {
              console.log(`[StorageService] Deleted ${targetPath} from Firebase Storage via CLI OAuth (${BUCKET_NAME})`);
            }
          } catch (restErr) {
            console.warn(`[StorageService] Firebase Storage delete notice:`, restErr.message);
          }
        }
      }
    }
  }

  /**
   * Check storage system health
   */
  async checkHealth() {
    let firebaseHealthy = false;
    const b = getStorageBucket();
    if (b) {
      try {
        await b.getMetadata();
        firebaseHealthy = true;
      } catch (e) {
        let token = getCliAccessToken();
        if (token) {
          try {
            let res = await fetch(`https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) firebaseHealthy = true;
          } catch (e) { }
        }
      }
    }
    const localHealthy = fs.existsSync(localBackupDir);
    return {
      firebaseHealthy,
      localHealthy,
      healthy: firebaseHealthy || localHealthy,
      storageRoot: `db_backups/ (Bucket: ${BUCKET_NAME})`
    };
  }
}

module.exports = new StorageService();
