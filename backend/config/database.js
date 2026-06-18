const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'godofmobiles',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
