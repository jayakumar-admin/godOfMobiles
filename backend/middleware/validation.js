const validateRegistration = (req, res, next) => {
  const errors = {};
  
  // Destructure body fields. Multer leaves files in req.files or req.file, other fields are in req.body.
  const {
    name,
    mobile_number,
    alternative_mobile_number,
    email,
    imei_1,
    imei_2,
    mobile_brand,
    mobile_model,
    missing_date,
    missing_location,
    consent
  } = req.body;

  if (!name || name.trim() === '') {
    errors.name = 'Name is required / பெயர் தேவை';
  }

  const mobileRegex = /^[6-9]\d{9}$/;
  if (!mobile_number) {
    errors.mobile_number = 'Mobile number is required / கைபேசி எண் தேவை';
  } else if (!mobileRegex.test(mobile_number)) {
    errors.mobile_number = 'Mobile number must be a valid 10-digit number / கைபேசி எண் 10 இலக்கங்களாக இருக்க வேண்டும்';
  }

  if (alternative_mobile_number && alternative_mobile_number.trim() !== '') {
    if (!mobileRegex.test(alternative_mobile_number)) {
      errors.alternative_mobile_number = 'Alternative mobile number must be a valid 10-digit number / மாற்று மொபைல் எண் 10 இலக்கங்களாக இருக்க வேண்டும்';
    }
  }

  if (email && email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.email = 'Invalid email format / மின்னஞ்சல் முகவரி தவறானது';
    }
  }

  const imeiRegex = /^\d{15}$/;
  if (!imei_1) {
    errors.imei_1 = 'IMEI 1 is required / IMEI 1 தேவை';
  } else if (!imeiRegex.test(imei_1)) {
    errors.imei_1 = 'IMEI 1 must be exactly 15 digits / IMEI 1 15 இலக்கங்களாக இருக்க வேண்டும்';
  }

  if (imei_2 && imei_2.trim() !== '') {
    if (!imeiRegex.test(imei_2)) {
      errors.imei_2 = 'IMEI 2 must be exactly 15 digits / IMEI 2 15 இலக்கங்களாக இருக்க வேண்டும்';
    }
  }

  if (!mobile_brand || mobile_brand.trim() === '') {
    errors.mobile_brand = 'Mobile brand is required / மொபைல் பிராண்ட் தேவை';
  }

  if (!mobile_model || mobile_model.trim() === '') {
    errors.mobile_model = 'Mobile model is required / மொபைல் மாடல் தேவை';
  }

  if (!missing_date || missing_date.trim() === '') {
    errors.missing_date = 'Missing date is required / தொலைந்த தேதி தேவை';
  }

  if (!missing_location || missing_location.trim() === '') {
    errors.missing_location = 'Missing location is required / தொலைந்த இடம் தேவை';
  }

  if (!consent || consent === 'false' || consent === false) {
    errors.consent = 'Consent is required / அனுமதி ஒப்புதல் தேவை';
  }

  // Validate uploaded files
  if (!req.files || !req.files['invoice_file']) {
    errors.invoice_file = 'Mobile Invoice is required / மொபைல் இன்வாய்ஸ் தேவை';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const errors = {};
  const { username, password } = req.body;

  if (!username || username.trim() === '') {
    errors.username = 'Username is required';
  }

  if (!password || password.trim() === '') {
    errors.password = 'Password is required';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ success: false, errors });
  }

  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
};
