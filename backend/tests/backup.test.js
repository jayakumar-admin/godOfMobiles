const assert = require('assert');
const test = require('node:test');
const db = require('../config/database');
const storageService = require('../services/storageService');
const backupService = require('../services/backupService');
const backupScheduler = require('../services/backupScheduler');
const AdmZip = require('adm-zip');
const crypto = require('crypto');

test('Database Backup & Disaster Recovery Test Suite', async (t) => {
  // Ensure table presence before running tests
  await db.query(`
    CREATE TABLE IF NOT EXISTS database_backups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
      size_bytes BIGINT DEFAULT 0,
      size_formatted VARCHAR(50),
      table_count INT DEFAULT 0,
      duration_ms INT DEFAULT 0,
      duration_formatted VARCHAR(50),
      checksum VARCHAR(128),
      created_by VARCHAR(150) DEFAULT 'System Cron',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await t.test('1. Firebase Storage Service Health & Direct Bucket Upload/Download', async () => {
    const health = await storageService.checkHealth();
    assert.strictEqual(health.healthy, true, 'Storage service should report healthy');
    assert.ok(health.storageRoot.includes('db_backups/'), 'Storage root should contain db_backups/');

    const testFileName = `test_firebase_upload_${Date.now()}.zip`;
    const testContent = Buffer.from('Mock ZIP Backup Content for Firebase Storage Unit Testing');

    const uploadRes = await storageService.uploadFile(testFileName, testContent);
    assert.strictEqual(uploadRes.storagePath, `db_backups/${testFileName}`);
    assert.strictEqual(uploadRes.uploadedToFirebase, true, 'File should be uploaded directly to Firebase Storage bucket (godofmobil.firebasestorage.app)');

    const downloadedBuffer = await storageService.downloadFile(uploadRes.storagePath);
    assert.strictEqual(downloadedBuffer.toString(), testContent.toString());

    await storageService.deleteFile(uploadRes.storagePath);
  });

  await t.test('2. Backup Creation & ZIP Archiving', async () => {
    const backup = await backupService.createBackup({
      type: 'MANUAL',
      createdBy: 'Test Suite Runner'
    });

    assert.ok(backup.id, 'Backup record should have UUID');
    assert.ok(backup.name.endsWith('.zip'), 'Backup filename should end with .zip');
    assert.strictEqual(backup.type, 'MANUAL');
    assert.strictEqual(backup.status, 'COMPLETED');
    assert.ok(backup.size_bytes > 0, 'Backup size should be > 0');
    assert.ok(backup.table_count >= 1, 'Table count should be at least 1');
    assert.ok(backup.checksum, 'SHA-256 Checksum should be generated');

    // Download and inspect ZIP package contents
    const zipBuffer = await storageService.downloadFile(backup.storage_path);
    const zip = new AdmZip(zipBuffer);

    const dumpEntry = zip.getEntry('dump.json');
    const sqlEntry = zip.getEntry('backup.sql');
    const metaEntry = zip.getEntry('metadata.json');

    assert.ok(dumpEntry, 'ZIP archive must contain dump.json');
    assert.ok(sqlEntry, 'ZIP archive must contain backup.sql');
    assert.ok(metaEntry, 'ZIP archive must contain metadata.json');

    // Verify SHA-256 Checksum accuracy
    const computedChecksum = crypto.createHash('sha256').update(zipBuffer).digest('hex');
    assert.strictEqual(backup.checksum, computedChecksum, 'Recorded checksum must match computed SHA-256 hash');
  });

  await t.test('3. Fetch Backups Vault & KPI Summary', async () => {
    const res = await backupService.getBackups();
    assert.ok(Array.isArray(res.backups), 'Backups list should be an array');
    assert.ok(res.stats, 'Stats summary object should be present');
    assert.strictEqual(res.stats.nextSchedule.title, 'Weekly Once');
    assert.strictEqual(res.stats.nextSchedule.detail, 'Sundays 02:00 AM IST');
    assert.ok(res.stats.dbTables >= 1);
  });

  await t.test('4. Database Restore with Automatic Safety Backup & Transaction', async () => {
    // Take a snapshot to restore from
    const baseBackup = await backupService.createBackup({
      type: 'MANUAL',
      createdBy: 'Pre-Restore Base Snapshot'
    });

    // Execute restore
    const restoreRes = await backupService.restoreBackup(baseBackup.id, 'Disaster Recovery Test');

    assert.strictEqual(restoreRes.success, true);
    assert.ok(restoreRes.restoredTablesCount >= 1);
    assert.ok(restoreRes.safetyBackupName, 'Safety backup should be created before restoring');

    // Check that a SAFETY backup record was logged
    const safetyCheck = await db.query(`SELECT * FROM database_backups WHERE type = 'SAFETY' ORDER BY created_at DESC LIMIT 1`);
    assert.ok(safetyCheck.rows.length > 0, 'Safety backup entry should exist in database_backups history');
  });

  await t.test('5. Checksum Tampering Security Test', async () => {
    // Create a valid backup
    const backup = await backupService.createBackup({
      type: 'MANUAL',
      createdBy: 'Security Test'
    });

    // Intentionally corrupt the checksum in the database catalog
    await db.query(`UPDATE database_backups SET checksum = 'invalid_tampered_checksum_12345' WHERE id = $1`, [backup.id]);

    // Attempting restore must fail with a security checksum exception
    await assert.rejects(
      async () => {
        await backupService.restoreBackup(backup.id, 'Attacker');
      },
      (err) => {
        assert.ok(err.message.includes('checksum verification failed'), 'Error message must specify checksum verification failure');
        return true;
      }
    );
  });

  await t.test('6. Weekly Scheduler Timing Check', async () => {
    backupScheduler.init();
    assert.strictEqual(backupScheduler.isRunning, true, 'Scheduler should be marked as running');
    backupScheduler.stop();
    assert.strictEqual(backupScheduler.isRunning, false, 'Scheduler should be stopped');
  });
});
