const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'invoice_file') {
    if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Mobile Invoice must be a PDF, JPG, or PNG / மொபைல் இன்வாய்ஸ் PDF, JPG அல்லது PNG ஆக இருக்க வேண்டும்'), false);
    }
  } else if (file.fieldname === 'mobile_photo') {
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Mobile Photo must be a JPG or PNG / மொபைல் புகைப்படம் JPG அல்லது PNG ஆக இருக்க வேண்டும்'), false);
    }
  } else if (file.fieldname === 'fir_file') {
    if (['.pdf', '.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('FIR copy must be a PDF, JPG, or PNG / காவல் நிலைய புகார்படி PDF, JPG அல்லது PNG ஆக இருக்க வேண்டும்'), false);
    }
  } else {
    cb(new Error('Unexpected file field'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;
