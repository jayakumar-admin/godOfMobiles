// index.js
const app = require("./app");
const functions = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');

// HTTP API Server endpoint
exports.api = functions.https.onRequest(app);

// Automated Weekly Database Backup Scheduled Job (Runs every Sunday at 02:00 AM IST)
exports.scheduledWeeklyBackup = onSchedule({
  schedule: '0 2 * * 0', // Every Sunday at 02:00 AM IST
  timeZone: 'Asia/Kolkata',
  retryCount: 3
}, async (event) => {
  console.log('[ScheduledWeeklyBackup] Triggering automated weekly database backup...');
  try {
    const backupService = require('./services/backupService');
    const backup = await backupService.createBackup({
      type: 'SCHEDULED',
      createdBy: 'Weekly Scheduled Cron (Firebase)'
    });
    console.log(`[ScheduledWeeklyBackup] Automated Weekly Backup completed successfully: ${backup.name} (${backup.size_formatted})`);
  } catch (err) {
    console.error('[ScheduledWeeklyBackup] Error executing scheduled weekly backup:', err);
    throw err;
  }
});
