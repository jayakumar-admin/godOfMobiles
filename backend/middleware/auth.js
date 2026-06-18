const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided / அனுமதி மறுக்கப்பட்டது' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. Token malformed / அனுமதி மறுக்கப்பட்டது' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkeyforgodofmobilesadmin123');
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token / தவறான டோக்கன்' });
  }
};

module.exports = verifyToken;
