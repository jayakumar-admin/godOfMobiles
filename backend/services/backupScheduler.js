const backupService = require('./backupService');
const db = require('../config/database');

class BackupScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Initialize weekly backup scheduler
   */
  init() {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[BackupScheduler] Weekly Database Backup Scheduler active (Schedule: Every Sunday at 02:00 AM IST)');

    // Run interval check every 1 minute
    this.intervalId = setInterval(() => {
      this.checkAndTriggerBackup();
    }, 60 * 1000);

    // Initial check on server boot (delayed by 5s to allow DB pool connection)
    setTimeout(() => {
      this.checkAndTriggerBackup();
    }, 5000);
  }

  /**
   * Check if weekly backup is due and trigger if needed
   */
  async checkAndTriggerBackup() {
    try {
      // Check last SCHEDULED backup date from database catalog
      const lastSchedRes = await db.query(`
        SELECT created_at FROM database_backups 
        WHERE type = 'SCHEDULED' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);

      const now = new Date();
      // Calculate IST time (UTC+5:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istTime = new Date(now.getTime() + istOffsetMs);
      const isSunday = istTime.getUTCDay() === 0;
      const is2AM = istTime.getUTCHours() === 2;

      let due = false;

      if (lastSchedRes.rows.length === 0) {
        // If no scheduled backup exists, trigger first scheduled snapshot if Sunday 2 AM
        if (isSunday && is2AM) {
          due = true;
        }
      } else {
        const lastDate = new Date(lastSchedRes.rows[0].created_at);
        const diffDays = (now.getTime() - lastDate.getTime()) / (1000 * 3600 * 24);

        // Trigger if:
        // 1. It is Sunday 02:00 AM IST and >= 6 days passed since last scheduled backup
        // 2. OR > 7.5 days passed since last scheduled backup (guarantees backup isn't lost if server was down at Sunday 2 AM)
        if ((isSunday && is2AM && diffDays >= 6) || diffDays >= 7.5) {
          due = true;
        }
      }

      if (due) {
        console.log('[BackupScheduler] Triggering automated Weekly Scheduled Database Backup...');
        const backup = await backupService.createBackup({
          type: 'SCHEDULED',
          createdBy: 'Weekly Scheduler'
        });
        console.log(`[BackupScheduler] Automated Weekly Backup completed successfully: ${backup.name} (${backup.size_formatted})`);
      }
    } catch (err) {
      console.error('[BackupScheduler] Error running scheduled backup check:', err);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
    }
  }
}

module.exports = new BackupScheduler();
