const app = require('./app');
const db = require('./config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Programmatic DB Initializer to ensure table presence
const initializeDatabase = async () => {
  try {
    // Enable uuid extension in PG
    await db.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    // Create Admins Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Registrations Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS mobile_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        mobile_number VARCHAR(15) NOT NULL,
        alternative_mobile_number VARCHAR(15),
        email VARCHAR(150),
        imei_1 VARCHAR(20) NOT NULL,
        imei_2 VARCHAR(20),
        mobile_brand VARCHAR(100),
        mobile_model VARCHAR(150),
        missing_date DATE,
        missing_location TEXT,
        police_complaint_no VARCHAR(100),
        incident_description TEXT,
        invoice_file VARCHAR(500),
        mobile_photo VARCHAR(500),
        fir_file VARCHAR(500),
        status VARCHAR(50) DEFAULT 'New',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Dynamic Configuration Settings Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Admin Account if table is empty
    const adminCheck = await db.query('SELECT * FROM admins WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await db.query(
        'INSERT INTO admins (username, password) VALUES ($1, $2)',
        ['admin', hashedPassword]
      );
      console.log('Seeder: Default administrator seeded (username: "admin")');
    }

    // Seed default Instagram settings
    const instaCheck = await db.query('SELECT * FROM app_settings WHERE key = $1', ['instagram_username']);
    if (instaCheck.rows.length === 0) {
      await db.query(
        "INSERT INTO app_settings (key, value) VALUES ($1, $2)",
        ['instagram_username', 'godofmobiles']
      );
      console.log('Seeder: Instagram username configuration seeded ("godofmobiles")');
    }

    console.log('Database tables validation and seed initialization completed successfully.');
  } catch (err) {
    console.error('Error checking or initializing database schema:', err);
  }
};

const startServer = async () => {
  try {
    // Confirm connection
    const res = await db.query('SELECT NOW()');
    console.log(`PostgreSQL Pool connected successfully. Server time: ${res.rows[0].now}`);

    // Set up database tables and seeds
    await initializeDatabase();

    // Start HTTP listener
    app.listen(PORT, () => {
      console.log(`GOD OF Mobiles API running on port ${PORT}`);
      console.log(`Interactive Swagger UI interface available at: http://localhost:${PORT}/api-docs`);
    });
  } catch (err) {
    console.error('Failed to initialize database connectivity or start server:', err);
    process.exit(1);
  }
};

startServer();
