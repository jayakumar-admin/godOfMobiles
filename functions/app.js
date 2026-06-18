const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const swaggerDocument = require('./config/swagger');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const app = express();

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: false, // Allows browser to fetch uploaded static files
}));

app.use(cors({
  origin: '*', // Customize this in production to match your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes / இந்த ஐபி முகவரியிலிருந்து மிக அதிகமான கோரிக்கைகள் வந்துள்ளன, 15 நிமிடங்களுக்குப் பிறகு மீண்டும் முயற்சிக்கவும்'
  }
});
app.use('/api', apiLimiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files Statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger API Documentation Interface
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Healthcheck Route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

// Catch 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found / கோரப்பட்ட முகவரி கிடைக்கவில்லை'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error / சேவையக பிழை';

  res.status(status).json({
    success: false,
    message: message
  });
});

module.exports = app;
