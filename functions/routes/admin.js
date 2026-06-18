const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const {
  login,
  getRegistrations,
  getRegistrationById,
  updateStatus,
  getDashboardStats,
  exportExcel,
  exportCSV,
  getSettings,
  updateSetting
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

module.exports = router;
