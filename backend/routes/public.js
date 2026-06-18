const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { validateRegistration } = require('../middleware/validation');
const { createRegistration, getInstagramFeed } = require('../controllers/registrationController');

// Define uploading fields
const fileFields = upload.fields([
  { name: 'invoice_file', maxCount: 1 },
  { name: 'mobile_photo', maxCount: 1 },
  { name: 'fir_file', maxCount: 1 }
]);

// POST /api/registrations
router.post('/registrations', (req, res, next) => {
  fileFields(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error during submission / கோப்பு பதிவேற்றத்தில் பிழை'
      });
    }
    next();
  });
}, validateRegistration, createRegistration);

// GET /api/instagram-feed
router.get('/instagram-feed', getInstagramFeed);

module.exports = router;
