const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Busboy = require('busboy');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Allowed extensions per field
const ALLOWED_EXTENSIONS = {
  invoice_file: ['.pdf', '.jpg', '.jpeg', '.png'],
  mobile_photo: ['.jpg', '.jpeg', '.png'],
  fir_file: ['.pdf', '.jpg', '.jpeg', '.png'],
};

const ERROR_MESSAGES = {
  invoice_file: 'Mobile Invoice must be a PDF, JPG, or PNG / மொபைல் இன்வாய்ஸ் PDF, JPG அல்லது PNG ஆக இருக்க வேண்டும்',
  mobile_photo: 'Mobile Photo must be a JPG or PNG / மொபைல் புகைப்படம் JPG அல்லது PNG ஆக இருக்க வேண்டும்',
  fir_file: 'FIR copy must be a PDF, JPG, or PNG / காவல் நிலைய புகார்படி PDF, JPG அல்லது PNG ஆக இருக்க வேண்டும்',
};

const FIELD_NAMES = ['invoice_file', 'mobile_photo', 'fir_file'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Detects if we're running inside Firebase Cloud Functions / Cloud Run.
 * Firebase pre-parses the request body, making req.rawBody available
 * and consuming the stream — which breaks multer.
 */
function isFirebaseEnvironment(req) {
  return !!req.rawBody;
}

/**
 * Busboy-based file parser for Firebase Cloud Functions.
 * Reads from req.rawBody instead of the consumed request stream.
 */
function firebaseBusboyUpload(req, res, next) {
  if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
    return next();
  }

  const busboy = Busboy({
    headers: req.headers,
    limits: { fileSize: MAX_FILE_SIZE },
  });

  req.body = req.body || {};
  req.files = {};

  const fileWrites = [];

  busboy.on('field', (fieldname, val) => {
    req.body[fieldname] = val;
  });

  busboy.on('file', (fieldname, fileStream, info) => {
    const { filename, encoding, mimeType } = info;

    // Check if field is expected
    if (!FIELD_NAMES.includes(fieldname)) {
      fileStream.resume(); // Drain the stream
      return;
    }

    // Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS[fieldname].includes(ext)) {
      fileStream.resume();
      return next(new Error(ERROR_MESSAGES[fieldname] || 'Invalid file type'));
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const savedFilename = fieldname + '-' + uniqueSuffix + ext;
    const saveTo = path.join(uploadDir, savedFilename);

    const writeStream = fs.createWriteStream(saveTo);
    fileStream.pipe(writeStream);

    let fileSize = 0;
    let fileTooLarge = false;

    fileStream.on('data', (data) => {
      fileSize += data.length;
      if (fileSize > MAX_FILE_SIZE) {
        fileTooLarge = true;
        fileStream.destroy();
      }
    });

    const writePromise = new Promise((resolve, reject) => {
      writeStream.on('finish', () => {
        if (fileTooLarge) {
          // Clean up oversized file
          fs.unlink(saveTo, () => {});
          return reject(new Error(`File ${fieldname} exceeds 5MB limit`));
        }

        // Populate req.files in the same format multer uses
        if (!req.files[fieldname]) {
          req.files[fieldname] = [];
        }
        req.files[fieldname].push({
          fieldname: fieldname,
          originalname: filename,
          encoding: encoding,
          mimetype: mimeType,
          destination: uploadDir,
          filename: savedFilename,
          path: saveTo,
          size: fileSize,
        });
        resolve();
      });
      writeStream.on('error', reject);
    });

    fileWrites.push(writePromise);
  });

  busboy.on('finish', async () => {
    try {
      await Promise.all(fileWrites);
      next();
    } catch (err) {
      next(err);
    }
  });

  busboy.on('error', (err) => {
    next(err);
  });

  // Write the rawBody into busboy instead of piping req (which is already consumed)
  if (req.rawBody) {
    busboy.end(req.rawBody);
  } else {
    req.pipe(busboy);
  }
}

// ---- Standard multer setup for local development ----
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
  const allowed = ALLOWED_EXTENSIONS[file.fieldname];

  if (!allowed) {
    cb(new Error('Unexpected file field'), false);
  } else if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(ERROR_MESSAGES[file.fieldname] || 'Invalid file type'), false);
  }
};

const multerUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

/**
 * Unified upload middleware that works in both local and Firebase environments.
 * Uses busboy (from rawBody) on Firebase, standard multer locally.
 */
const upload = {
  fields(fieldConfigs) {
    const multerMiddleware = multerUpload.fields(fieldConfigs);

    return (req, res, next) => {
      if (isFirebaseEnvironment(req)) {
        // Firebase environment: use busboy with rawBody
        firebaseBusboyUpload(req, res, next);
      } else {
        // Local environment: use standard multer
        multerMiddleware(req, res, next);
      }
    };
  },
};

module.exports = upload;
