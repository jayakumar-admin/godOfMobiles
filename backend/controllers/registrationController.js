const db = require('../config/database');
const crypto = require('crypto');

const createRegistration = async (req, res) => {
  try {
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
      police_complaint_no,
      incident_description,
    } = req.body;

    // Multer uploads files grouped by fields
    const invoice_file = req.files && req.files['invoice_file'] ? req.files['invoice_file'][0].filename : null;
    const mobile_photo = req.files && req.files['mobile_photo'] ? req.files['mobile_photo'][0].filename : null;
    const fir_file = req.files && req.files['fir_file'] ? req.files['fir_file'][0].filename : null;

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO mobile_registrations (
        id, name, mobile_number, alternative_mobile_number, email, 
        imei_1, imei_2, mobile_brand, mobile_model, missing_date, 
        missing_location, police_complaint_no, incident_description, 
        invoice_file, mobile_photo, fir_file, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'New')
      RETURNING *
    `;

    const values = [
      id,
      name,
      mobile_number,
      alternative_mobile_number || null,
      email || null,
      imei_1,
      imei_2 || null,
      mobile_brand,
      mobile_model,
      missing_date,
      missing_location,
      police_complaint_no || null,
      incident_description || null,
      invoice_file,
      mobile_photo || null,
      fir_file || null
    ];

    const result = await db.query(query, values);
    
    // Log for Auditing
    console.log(`[Audit Log] ${new Date().toISOString()} - Registration created. ID: ${id}, Name: ${name}, IMEI1: ${imei_1}`);

    res.status(201).json({
      success: true,
      message: 'Mobile recovery registration submitted successfully / மொபைல் மீட்பு கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது',
      data: result.rows[0],
    });
  } catch (err) {
    console.error('Error creating registration:', err);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration / பதிவின் போது சேவையக பிழை ஏற்பட்டது',
    });
  }
};

const getInstagramFeed = async (req, res) => {
  try {
    const settingsQuery = 'SELECT value FROM app_settings WHERE key = $1';
    const settingsResult = await db.query(settingsQuery, ['instagram_username']);
    const username = settingsResult.rows.length > 0 ? settingsResult.rows[0].value : 'godofmobiles';

    // Real extracted posts list using local public assets to prevent URL expiration
    const posts = [
      {
        id: 'inst_1',
        media_url: '/images/instagram/post1.jpg',
        permalink: 'https://www.instagram.com/godofmobiles/reel/DAJBcm7AFlQ/',
        caption: 'Hi guys if you lost your mobile.contact me I will help you \nTq frnds 🤝.\n.\n.\n.\n.\n#tanjavur#mobiles \n#tamilnadu #findmydevice \n#trending #location',
        timestamp: new Date().toISOString()
      },
      {
        id: 'inst_2',
        media_url: '/images/instagram/post2.jpg',
        permalink: 'https://www.instagram.com/godofmobiles/reel/C9aDi6VMXHk/',
        caption: 'Hi friends if you lost your mobile contact me I will help you tq frnds 🤝.\n.\n.\n.\n.\n#tamilreels \n#mobiles #findmymobile \n#location #mobilemissing',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'inst_3',
        media_url: '/images/instagram/post3.jpg',
        permalink: 'https://www.instagram.com/godofmobiles/reel/C43GwYeSjx-/',
        caption: 'Hi friends if loss your mobile  contact me I will help you tq frnds 🤝.\n.\n.\n#mobiles #reels \n#findmymobile #findmydevice \n#trending #tamilnadu #tiruchy',
        timestamp: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'inst_4',
        media_url: '/images/instagram/post4.jpg',
        permalink: 'https://www.instagram.com/godofmobiles/reel/DZfAmjRuiiQ/',
        caption: 'Hi chennai guys if you lost your mobile dm me\nI will help you tq guys 🤝.\n.\n.\n.\n.\n.#mobile #chennai \n#finemydevice #trendingreels \n#godofmobiles',
        timestamp: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'inst_5',
        media_url: '/images/instagram/post5.jpg',
        permalink: 'https://www.instagram.com/godofmobiles/reel/DXMLkHdEfW3/',
        caption: 'Hi thiruchy guys if you lost your mobile dm me \nI will help you tq guys 🤝. \n\n.\n.\n.\n#mobiles #thiruchirapalli \n#findmydevice #trendingreels \n#dindigul',
        timestamp: new Date(Date.now() - 345600000).toISOString()
      }
    ];

    res.json({
      success: true,
      username,
      posts
    });
  } catch (err) {
    console.error('Error fetching Instagram feed configuration:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Instagram feed'
    });
  }
};

module.exports = {
  createRegistration,
  getInstagramFeed,
};
