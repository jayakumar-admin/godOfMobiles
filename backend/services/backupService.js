const db = require('../config/database');
const storageService = require('./storageService');
const AdmZip = require('adm-zip');
const crypto = require('crypto');
const path = require('path');

// Format bytes into human-readable string
function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

class BackupService {
  /**
   * Create database backup snapshot (MANUAL, SCHEDULED, SAFETY, UPLOAD)
   */
  async createBackup(options = {}) {
    const {
      type = 'MANUAL',
      createdBy = 'Administrator',
      fileBuffer = null,
      customName = null
    } = options;

    const startTime = Date.now();
    let zipBuffer = fileBuffer;
    let tableCount = 0;
    let tablesList = [];
    let dumpObj = null;

    if (!zipBuffer) {
      // 1. Fetch all tables from current PostgreSQL database
      const tablesRes = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'spatial_ref_sys'
        ORDER BY table_name ASC
      `);

      tablesList = tablesRes.rows.map(r => r.table_name);
      tableCount = tablesList.length;

      // 2. Dump schema and rows for each table
      const dumpedTables = {};
      let sqlScript = `-- GOD OF MOBILES PostgreSQL Database Vault Snapshot\n`;
      sqlScript += `-- Created: ${new Date().toISOString()}\n`;
      sqlScript += `-- Type: ${type}\n\n`;

      for (const tableName of tablesList) {
        // Fetch columns
        const colRes = await db.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);

        const columns = colRes.rows;

        // Fetch rows
        const dataRes = await db.query(`SELECT * FROM "${tableName}"`);
        const rows = dataRes.rows;

        dumpedTables[tableName] = {
          columns,
          rowCount: rows.length,
          rows
        };

        // Build SQL insert statements for human-readable fallback
        sqlScript += `-- Table: ${tableName} (${rows.length} rows)\n`;
        if (rows.length > 0) {
          for (const row of rows) {
            const keys = Object.keys(row);
            const vals = Object.values(row).map(v => {
              if (v === null || v === undefined) return 'NULL';
              if (typeof v === 'boolean' || typeof v === 'number') return v;
              if (v instanceof Date) return `'${v.toISOString()}'`;
              if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
              return `'${String(v).replace(/'/g, "''")}'`;
            });
            sqlScript += `INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`;
          }
        }
        sqlScript += `\n`;
      }

      dumpObj = {
        version: '1.0',
        system: 'GOD OF Mobiles DB Vault',
        createdAt: new Date().toISOString(),
        type,
        createdBy,
        tableCount,
        tables: dumpedTables
      };

      const metadataObj = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        type,
        createdBy,
        tableCount,
        tablesList
      };

      // 3. Create ZIP archive
      const zip = new AdmZip();
      zip.addFile('dump.json', Buffer.from(JSON.stringify(dumpObj, null, 2), 'utf8'));
      zip.addFile('backup.sql', Buffer.from(sqlScript, 'utf8'));
      zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadataObj, null, 2), 'utf8'));

      zipBuffer = zip.toBuffer();
    } else {
      // Analyze uploaded ZIP
      try {
        const zip = new AdmZip(zipBuffer);
        const metaEntry = zip.getEntry('metadata.json') || zip.getEntry('dump.json');
        if (metaEntry) {
          const content = JSON.parse(zip.readAsText(metaEntry));
          if (content.tablesList) tablesList = content.tablesList;
          else if (content.tables) tablesList = Object.keys(content.tables);
          tableCount = tablesList.length;
        }
      } catch (e) {
        console.warn('[BackupService] Unable to parse metadata from uploaded zip buffer:', e.message);
      }
    }

    const durationMs = Date.now() - startTime;
    const durationFormatted = `${durationMs} ms`;

    // 4. Calculate SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    const sizeBytes = zipBuffer.length;
    const sizeFormatted = formatBytes(sizeBytes);

    // 5. Generate sanitized filename
    const rawFileName = customName || `db_backup_${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}_${type.toLowerCase()}.zip`;
    const fileName = path.basename(rawFileName);

    // 6. Upload to Storage (Firebase Storage root: db_backups/)
    const uploadRes = await storageService.uploadFile(fileName, zipBuffer);

    // 7. Store record in database
    const insertRes = await db.query(`
      INSERT INTO database_backups (
        name, storage_path, type, status, size_bytes, size_formatted, 
        table_count, duration_ms, duration_formatted, checksum, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      fileName,
      uploadRes.storagePath,
      type,
      'COMPLETED',
      sizeBytes,
      sizeFormatted,
      tableCount,
      durationMs,
      durationFormatted,
      checksum,
      createdBy
    ]);

    const backupRecord = insertRes.rows[0];

    // 8. Auto Retention Cleanup (Keep latest 8)
    await this.enforceRetentionPolicy(8);

    return backupRecord;
  }

  /**
   * Enforce retention policy (default max 8 backups)
   */
  async enforceRetentionPolicy(maxKeep = 8) {
    try {
      const countRes = await db.query(`SELECT COUNT(*) FROM database_backups`);
      const total = parseInt(countRes.rows[0].count, 10);
      if (total > maxKeep) {
        const excess = total - maxKeep;
        const toDeleteRes = await db.query(`
          SELECT id, storage_path FROM database_backups
          ORDER BY created_at ASC
          LIMIT $1
        `, [excess]);

        for (const row of toDeleteRes.rows) {
          await storageService.deleteFile(row.storage_path);
          await db.query(`DELETE FROM database_backups WHERE id = $1`, [row.id]);
        }
        console.log(`[BackupService] Retention policy applied: purged ${toDeleteRes.rows.length} old backup(s)`);
      }
    } catch (err) {
      console.error('[BackupService] Error enforcing retention policy:', err);
    }
  }

  /**
   * Restore database snapshot by backup ID with SHA-256 Checksum Validation
   */
  async restoreBackup(backupId, restoredBy = 'Administrator') {
    // 1. Fetch backup record
    const res = await db.query(`SELECT * FROM database_backups WHERE id = $1`, [backupId]);
    if (res.rows.length === 0) {
      throw new Error('Backup record not found in database catalog');
    }
    const backupRecord = res.rows[0];

    // 2. Download zip buffer from storage
    const zipBuffer = await storageService.downloadFile(backupRecord.storage_path);

    // 3. Security SHA-256 Checksum Verification
    if (backupRecord.checksum) {
      const actualChecksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
      if (actualChecksum !== backupRecord.checksum) {
        throw new Error(`Security Violation: Backup ZIP checksum verification failed! Expected ${backupRecord.checksum}, calculated ${actualChecksum}. The file may be corrupted or tampered with.`);
      }
    }

    // 4. Execute atomic database restore with safety backup
    const restoreResult = await this.restoreFromZipBuffer(zipBuffer, restoredBy);

    // 5. Mark backup record status as RESTORED
    await db.query(`UPDATE database_backups SET status = 'RESTORED' WHERE id = $1`, [backupId]);

    return {
      ...restoreResult,
      backupId: backupRecord.id,
      backupName: backupRecord.name
    };
  }

  /**
   * Restore database from raw ZIP file buffer (Atomic Transaction + Safety Backup)
   */
  async restoreFromZipBuffer(zipBuffer, restoredBy = 'Administrator') {
    // A. ALWAYS CREATE SAFETY BACKUP BEFORE RESTORING!
    let safetyBackup = null;
    try {
      safetyBackup = await this.createBackup({
        type: 'SAFETY',
        createdBy: `Auto Safety (${restoredBy})`,
        customName: `safety_pre_restore_${Date.now()}.zip`
      });
      console.log(`[BackupService] Pre-restore safety backup generated: ${safetyBackup.name}`);
    } catch (e) {
      console.warn('[BackupService] Failed to create pre-restore safety backup:', e.message);
    }

    // B. Parse ZIP archive
    const zip = new AdmZip(zipBuffer);
    const dumpEntry = zip.getEntry('dump.json');
    if (!dumpEntry) {
      throw new Error('Invalid backup package: missing dump.json file inside ZIP archive');
    }

    const dumpData = JSON.parse(zip.readAsText(dumpEntry));
    const tablesObj = dumpData.tables;
    if (!tablesObj) {
      throw new Error('Invalid backup dump data: no tables structure found in snapshot');
    }

    const restoredTables = [];
    let totalRestoredRows = 0;

    // C. Execute atomic transaction restore
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL session_replication_role = 'replica'");

      for (const tableName of Object.keys(tablesObj)) {
        if (tableName === 'database_backups') continue; // Preserve backup vault records during restore

        const tableData = tablesObj[tableName];
        const rows = tableData.rows || [];

        // Clear existing rows in target table safely within transaction
        await client.query(`DELETE FROM "${tableName}"`);

        // Re-insert backup rows
        if (rows.length > 0) {
          for (const row of rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
            const values = Object.values(row);

            const insertSql = `
              INSERT INTO "${tableName}" (${keys.map(k => `"${k}"`).join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;
            await client.query(insertSql, values);
          }
        }

        // Synchronize auto-incrementing serial sequences for tables
        try {
          const seqColsRes = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public' 
              AND table_name = $1 
              AND column_default LIKE 'nextval%'
          `, [tableName]);

          for (const colRow of seqColsRes.rows) {
            const colName = colRow.column_name;
            await client.query(`
              SELECT setval(
                pg_get_serial_sequence($1, $2), 
                COALESCE((SELECT MAX("${colName}") FROM "${tableName}"), 1)
              )
            `, [tableName, colName]);
          }
        } catch (seqErr) {
          // Ignore if sequence update fails
        }

        restoredTables.push(tableName);
        totalRestoredRows += rows.length;
      }

      await client.query('COMMIT');
      console.log(`[BackupService] Successfully restored ${restoredTables.length} tables (${totalRestoredRows} rows) in atomic transaction.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[BackupService] Transaction failed during restore, executed ROLLBACK:', err.message);
      throw new Error(`Database restore failed and was safely rolled back: ${err.message}`);
    } finally {
      client.release();
    }

    return {
      success: true,
      restoredTablesCount: restoredTables.length,
      restoredTables,
      totalRestoredRows,
      safetyBackupName: safetyBackup ? safetyBackup.name : null
    };
  }

  /**
   * Get all database backups with search, filter, and KPI metrics
   */
  async getBackups(filters = {}) {
    const { search = '', type = '' } = filters;

    let queryStr = `SELECT * FROM database_backups WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (name ILIKE $${params.length} OR checksum ILIKE $${params.length} OR created_by ILIKE $${params.length})`;
    }

    if (type && type !== 'ALL') {
      params.push(type);
      queryStr += ` AND type = $${params.length}`;
    }

    queryStr += ` ORDER BY created_at DESC`;

    const res = await db.query(queryStr, params);
    const backups = res.rows;

    // Get overall stats from DB without filters
    const allStatsRes = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(size_bytes), 0) as total_bytes
      FROM database_backups
    `);
    const totalCount = parseInt(allStatsRes.rows[0].total_count, 10);
    const totalStorageBytes = parseInt(allStatsRes.rows[0].total_bytes, 10);

    let lastBackup = null;
    let lastSize = '0 B';
    let lastDuration = '-';

    const latestRes = await db.query(`
      SELECT * FROM database_backups ORDER BY created_at DESC LIMIT 1
    `);
    if (latestRes.rows.length > 0) {
      lastBackup = latestRes.rows[0];
      lastSize = lastBackup.size_formatted;
      lastDuration = lastBackup.duration_formatted;
    }

    // Get count of DB tables
    const tableCountRes = await db.query(`
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name != 'spatial_ref_sys'
    `);
    const dbTables = parseInt(tableCountRes.rows[0].table_count, 10);

    const storageHealth = await storageService.checkHealth();

    return {
      backups,
      stats: {
        lastBackup: lastBackup ? {
          name: lastBackup.name,
          createdAt: lastBackup.created_at,
          checksum: lastBackup.checksum,
          type: lastBackup.type
        } : null,
        nextSchedule: {
          title: 'Weekly Once',
          detail: 'Sundays 02:00 AM IST'
        },
        totalBackups: totalCount,
        retentionPolicy: 'Keep latest 8',
        storageUsedBytes: totalStorageBytes,
        storageUsedFormatted: formatBytes(totalStorageBytes),
        dbTables,
        tablesSubtitle: '100% current & future tables',
        lastSize,
        lastDuration,
        systemHealth: storageHealth.healthy ? 'HEALTHY' : 'DEGRADED',
        storageRoot: storageHealth.storageRoot
      }
    };
  }

  /**
   * Delete backup record and storage file
   */
  async deleteBackup(id) {
    const res = await db.query(`SELECT * FROM database_backups WHERE id = $1`, [id]);
    if (res.rows.length === 0) {
      throw new Error('Backup record not found');
    }
    const record = res.rows[0];
    await storageService.deleteFile(record.storage_path);
    await db.query(`DELETE FROM database_backups WHERE id = $1`, [id]);
    return { success: true, deletedId: id };
  }
}

module.exports = new BackupService();
