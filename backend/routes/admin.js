const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const upload = require('../middleware/upload');
const {
  login,
  getRegistrations,
  getRegistrationById,
  updateStatus,
  getDashboardStats,
  exportExcel,
  exportCSV,
  getSettings,
  updateSetting,
  getBackups,
  createBackup,
  uploadBackup,
  restoreBackup,
  downloadBackup,
  deleteBackup,
  checkSystemHealth
} = require('../controllers/adminController');

// Admin Auth (Publicly accessible)
router.post('/login', validateLogin, login);

// Admin Management APIs (Protected by JWT validation)
router.get('/registrations', verifyToken, getRegistrations);
router.get('/registrations/:id', verifyToken, getRegistrationById);
router.put('/registrations/:id', verifyToken, updateStatus);
router.get('/dashboard-stats', verifyToken, getDashboardStats);
router.get('/export/excel', verifyToken, exportExcel);
router.get('/export/csv', verifyToken, exportCSV);
router.get('/settings', verifyToken, getSettings);
router.put('/settings', verifyToken, updateSetting);

// Database Backup & Disaster Recovery APIs
router.get('/backups', verifyToken, getBackups);
router.post('/backups/now', verifyToken, createBackup);
router.post('/backups/upload', verifyToken, upload.fields([{ name: 'backup_zip', maxCount: 1 }]), uploadBackup);
router.post('/backups/:id/restore', verifyToken, restoreBackup);
router.get('/backups/:id/download', verifyToken, downloadBackup);
router.delete('/backups/:id', verifyToken, deleteBackup);
router.get('/backups/health', verifyToken, checkSystemHealth);

module.exports = router;

