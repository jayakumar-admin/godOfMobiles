const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ExcelJS = require('exceljs');
require('dotenv').config();

// Admin Login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const query = 'SELECT * FROM admins WHERE username = $1';
    const result = await db.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid username or password / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password / தவறான பயனர் பெயர் அல்லது கடவுச்சொல்' });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username },
      process.env.JWT_SECRET || 'supersecretjwtkeyforgodofmobilesadmin123',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      admin: { id: admin.id, username: admin.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
};

// Build reusable SQL filters
const buildFilters = (query) => {
  const { search, brand, status, startDate, endDate } = query;
  
  let whereClauses = [];
  let values = [];
  let paramIndex = 1;

  if (search && search.trim() !== '') {
    whereClauses.push(`(name ILIKE $${paramIndex} OR mobile_number ILIKE $${paramIndex} OR alternative_mobile_number ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR imei_1 ILIKE $${paramIndex} OR imei_2 ILIKE $${paramIndex} OR mobile_model ILIKE $${paramIndex})`);
    values.push(`%${search}%`);
    paramIndex++;
  }

  if (brand && brand.trim() !== '') {
    whereClauses.push(`mobile_brand = $${paramIndex}`);
    values.push(brand);
    paramIndex++;
  }

  if (status && status.trim() !== '') {
    whereClauses.push(`status = $${paramIndex}`);
    values.push(status);
    paramIndex++;
  }

  if (startDate && startDate.trim() !== '') {
    whereClauses.push(`missing_date >= $${paramIndex}`);
    values.push(startDate);
    paramIndex++;
  }

  if (endDate && endDate.trim() !== '') {
    whereClauses.push(`missing_date <= $${paramIndex}`);
    values.push(endDate);
    paramIndex++;
  }

  return {
    whereSql: whereClauses.length > 0 ? ' AND ' + whereClauses.join(' AND ') : '',
    values,
    nextParamIndex: paramIndex
  };
};

// Get Paginated Registrations
const getRegistrations = async (req, res) => {
  try {
    const { page = 1, limit = 10, sortField = 'created_at', sortOrder = 'DESC' } = req.query;

    const { whereSql, values, nextParamIndex } = buildFilters(req.query);

    // Validate sort fields to prevent SQL injection
    const allowedFields = ['id', 'name', 'mobile_number', 'alternative_mobile_number', 'email', 'imei_1', 'imei_2', 'mobile_brand', 'mobile_model', 'missing_date', 'status', 'created_at', 'updated_at'];
    const safeSortField = allowedFields.includes(sortField) ? sortField : 'created_at';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count Total Query
    const countQuery = `SELECT COUNT(*) FROM mobile_registrations WHERE 1=1 ${whereSql}`;
    const countResult = await db.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Paginated Data Query
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let dataQuery = `SELECT * FROM mobile_registrations WHERE 1=1 ${whereSql} ORDER BY ${safeSortField} ${safeSortOrder} LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}`;
    const queryValues = [...values, limitNum, offset];

    const dataResult = await db.query(dataQuery, queryValues);

    res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err) {
    console.error('Error fetching registrations:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve registrations' });
  }
};

// Get Registration by ID
const getRegistrationById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM mobile_registrations WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error fetching registration detail:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve registration detail' });
  }
};

// Update Registration Status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['New', 'Under Review', 'Contacted', 'Recovery In Progress', 'Recovered', 'Closed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const query = `
      UPDATE mobile_registrations 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await db.query(query, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    console.log(`[Audit Log] ${new Date().toISOString()} - Registration ID: ${id} updated status to ${status} by admin.`);

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating status:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

// Get Dashboard KPIs
const getDashboardStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN CAST(created_at AS DATE) = CURRENT_DATE THEN 1 END) as today,
        COUNT(CASE WHEN status = 'New' THEN 1 END) as new,
        COUNT(CASE WHEN status = 'Under Review' THEN 1 END) as under_review,
        COUNT(CASE WHEN status = 'Contacted' THEN 1 END) as contacted,
        COUNT(CASE WHEN status = 'Recovery In Progress' THEN 1 END) as recovery_in_progress,
        COUNT(CASE WHEN status = 'Recovered' THEN 1 END) as recovered,
        COUNT(CASE WHEN status = 'Closed' THEN 1 END) as closed
      FROM mobile_registrations
    `;
    const statsResult = await db.query(statsQuery);
    const row = statsResult.rows[0];

    const total = parseInt(row.total, 10);
    const today = parseInt(row.today, 10);
    const countNew = parseInt(row.new, 10);
    const countUnderReview = parseInt(row.under_review, 10);
    const countContacted = parseInt(row.contacted, 10);
    const countInProgress = parseInt(row.recovery_in_progress, 10);
    const countRecovered = parseInt(row.recovered, 10);
    const countClosed = parseInt(row.closed, 10);

    // Pending Cases = New + Under Review + Contacted
    const pending = countNew + countUnderReview + countContacted;

    res.json({
      success: true,
      data: {
        totalRegistrations: total,
        todayRegistrations: today,
        pendingCases: pending,
        underReviewCases: countUnderReview,
        recoveryInProgress: countInProgress,
        recoveredCases: countRecovered,
        closedCases: countClosed
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve dashboard stats' });
  }
};

// Fetch unpaginated registrations based on filters for exports
const getFilteredRegistrationsList = async (queryParams) => {
  const { whereSql, values } = buildFilters(queryParams);
  const { sortField = 'created_at', sortOrder = 'DESC' } = queryParams;

  const allowedFields = ['id', 'name', 'mobile_number', 'alternative_mobile_number', 'email', 'imei_1', 'imei_2', 'mobile_brand', 'mobile_model', 'missing_date', 'status', 'created_at', 'updated_at'];
  const safeSortField = allowedFields.includes(sortField) ? sortField : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const query = `SELECT * FROM mobile_registrations WHERE 1=1 ${whereSql} ORDER BY ${safeSortField} ${safeSortOrder}`;
  const result = await db.query(query, values);
  return result.rows;
};

// Export to Excel
const exportExcel = async (req, res) => {
  try {
    const list = await getFilteredRegistrationsList(req.query);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Registrations');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Mobile Number', key: 'mobile_number', width: 15 },
      { header: 'Alt Mobile Number', key: 'alternative_mobile_number', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'IMEI 1', key: 'imei_1', width: 20 },
      { header: 'IMEI 2', key: 'imei_2', width: 20 },
      { header: 'Brand', key: 'mobile_brand', width: 15 },
      { header: 'Model', key: 'mobile_model', width: 20 },
      { header: 'Missing Date', key: 'missing_date', width: 15 },
      { header: 'Missing Location', key: 'missing_location', width: 30 },
      { header: 'Police Complaint No', key: 'police_complaint_no', width: 20 },
      { header: 'Incident Description', key: 'incident_description', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Created Date', key: 'created_at', width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '0F172A' } // Primary Dark Blue
    };

    list.forEach((item) => {
      worksheet.addRow({
        id: item.id,
        name: item.name,
        mobile_number: item.mobile_number,
        alternative_mobile_number: item.alternative_mobile_number || '',
        email: item.email || '',
        imei_1: item.imei_1,
        imei_2: item.imei_2 || '',
        mobile_brand: item.mobile_brand,
        mobile_model: item.mobile_model,
        missing_date: item.missing_date ? new Date(item.missing_date).toISOString().split('T')[0] : '',
        missing_location: item.missing_location || '',
        police_complaint_no: item.police_complaint_no || '',
        incident_description: item.incident_description || '',
        status: item.status,
        created_at: item.created_at ? new Date(item.created_at).toISOString() : '',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `registrations_export_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ success: false, message: 'Failed to export Excel file' });
  }
};

// Helper for CSV escaping
const escapeCSV = (val) => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  str = str.replace(/"/g, '""');
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
};

// Export to CSV
const exportCSV = async (req, res) => {
  try {
    const list = await getFilteredRegistrationsList(req.query);

    const headers = [
      'ID', 'Name', 'Mobile Number', 'Alternative Mobile Number', 'Email', 
      'IMEI 1', 'IMEI 2', 'Mobile Brand', 'Mobile Model', 'Missing Date', 
      'Missing Location', 'Police Complaint No', 'Incident Description', 'Status', 'Created Date'
    ];

    let csvContent = headers.join(',') + '\r\n';

    list.forEach((item) => {
      const row = [
        escapeCSV(item.id),
        escapeCSV(item.name),
        escapeCSV(item.mobile_number),
        escapeCSV(item.alternative_mobile_number),
        escapeCSV(item.email),
        escapeCSV(item.imei_1),
        escapeCSV(item.imei_2),
        escapeCSV(item.mobile_brand),
        escapeCSV(item.mobile_model),
        escapeCSV(item.missing_date ? new Date(item.missing_date).toISOString().split('T')[0] : ''),
        escapeCSV(item.missing_location),
        escapeCSV(item.police_complaint_no),
        escapeCSV(item.incident_description),
        escapeCSV(item.status),
        escapeCSV(item.created_at ? new Date(item.created_at).toISOString() : '')
      ];
      csvContent += row.join(',') + '\r\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `registrations_export_${Date.now()}.csv`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    console.error('CSV export error:', err);
    res.status(500).json({ success: false, message: 'Failed to export CSV file' });
  }
};

// App Settings (Instagram configuration)
const getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM app_settings');
    const settingsMap = {};
    result.rows.forEach(row => {
      settingsMap[row.key] = row.value;
    });
    res.json({ success: true, settings: settingsMap });
  } catch (err) {
    console.error('Error getting settings:', err);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Key and value are required' });
    }

    const query = `
      INSERT INTO app_settings (key, value, updated_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await db.query(query, [key, value]);
    
    console.log(`[Audit Log] ${new Date().toISOString()} - Setting "${key}" updated to "${value}" by admin.`);

    res.json({ success: true, message: 'Setting updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Error updating setting:', err);
    res.status(500).json({ success: false, message: 'Failed to update setting' });
  }
};

module.exports = {
  login,
  getRegistrations,
  getRegistrationById,
  updateStatus,
  getDashboardStats,
  exportExcel,
  exportCSV,
  getSettings,
  updateSetting
};
