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

    if (!invoice_file) {
      return res.status(400).json({
        success: false,
        errors: { invoice_file: 'Mobile invoice is required / மொபைல் இன்வாய்ஸ் தேவை' }
      });
    }

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

    // Mock grid for high-end feel displaying dynamic images
    const posts = [
      {
        id: 'inst_1',
        media_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Another device recovered successfully! Trust our experts to locate your lost phone. #mobilerecovery #godofmobiles',
        timestamp: new Date().toISOString()
      },
      {
        id: 'inst_2',
        media_url: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Lost your mobile phone? Don\'t panic. Follow our 4-step recovery guidance now. #safetyfirst',
        timestamp: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'inst_3',
        media_url: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Bilingual support in English and Tamil. Contact our team instantly via WhatsApp. #tamilnadu #recovery',
        timestamp: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'inst_4',
        media_url: 'https://images.unsplash.com/photo-1565849906461-09a2fa5000af?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Security and high trust. We keep your device details safe during search. #securedata #privacy',
        timestamp: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'inst_5',
        media_url: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Check out our 98% success rate in tracking and recovering IMEI. #trackphone #imei',
        timestamp: new Date(Date.now() - 345600000).toISOString()
      },
      {
        id: 'inst_6',
        media_url: 'https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=600&auto=format&fit=crop',
        permalink: `https://www.instagram.com/${username}/`,
        caption: 'Quick Tips: Write down your IMEI numbers and register police complaints immediately when lost. #mobilesafety',
        timestamp: new Date(Date.now() - 432000000).toISOString()
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
