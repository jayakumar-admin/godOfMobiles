-- PostgreSQL Database Schema for GOD OF Mobiles

-- Enable extensions if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Admin Accounts
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mobile Registrations
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
);

-- App Settings (for Instagram username, contact numbers, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and quick searching
CREATE INDEX IF NOT EXISTS idx_registrations_mobile_number ON mobile_registrations(mobile_number);
CREATE INDEX IF NOT EXISTS idx_registrations_imei_1 ON mobile_registrations(imei_1);
CREATE INDEX IF NOT EXISTS idx_registrations_status ON mobile_registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_brand ON mobile_registrations(mobile_brand);
CREATE INDEX IF NOT EXISTS idx_registrations_missing_date ON mobile_registrations(missing_date);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at ON mobile_registrations(created_at);
