const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'GOD OF Mobiles API Docs',
    version: '1.0.0',
    description: 'REST API documentation for the GOD OF Mobiles Mobile Recovery Platform.',
  },
  servers: [
    {
      url: '/api',
      description: 'API Server Path Prefix',
    },
  ],
  paths: {
    '/registrations': {
      post: {
        tags: ['Public API'],
        summary: 'Create a new mobile registration',
        description: 'Submits user information, missing phone specs, and uploads proof files.',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Arun Kumar' },
                  mobile_number: { type: 'string', example: '9876543210' },
                  alternative_mobile_number: { type: 'string', example: '9876543211' },
                  email: { type: 'string', example: 'arun@example.com' },
                  imei_1: { type: 'string', example: '123456789012345' },
                  imei_2: { type: 'string', example: '123456789012346' },
                  mobile_brand: { type: 'string', example: 'Samsung' },
                  mobile_model: { type: 'string', example: 'Galaxy S24' },
                  missing_date: { type: 'string', format: 'date', example: '2026-06-15' },
                  missing_location: { type: 'string', example: 'T Nagar, Chennai' },
                  police_complaint_no: { type: 'string', example: 'FIR-45892-2026' },
                  incident_description: { type: 'string', example: 'Slipped from pocket while traveling in bus.' },
                  invoice_file: { type: 'string', format: 'binary', description: 'Upload Invoice (PDF/JPG/PNG)' },
                  mobile_photo: { type: 'string', format: 'binary', description: 'Upload Mobile Photo (JPG/PNG)' },
                  fir_file: { type: 'string', format: 'binary', description: 'Upload FIR copy (PDF/JPG/PNG)' },
                  consent: { type: 'boolean', example: true }
                },
                required: ['name', 'mobile_number', 'imei_1', 'mobile_brand', 'mobile_model', 'missing_date', 'missing_location', 'invoice_file', 'consent']
              }
            }
          }
        },
        responses: {
          201: { description: 'Registration created successfully' },
          400: { description: 'Bad Request - Validation or upload failures' },
          500: { description: 'Internal Server Error' }
        }
      }
    },
    '/instagram-feed': {
      get: {
        tags: ['Public API'],
        summary: 'Get Instagram feed posts',
        description: 'Retrieves simulated latest posts based on the configured public username.',
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    username: { type: 'string' },
                    posts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          media_url: { type: 'string' },
                          permalink: { type: 'string' },
                          caption: { type: 'string' },
                          timestamp: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/admin/login': {
      post: {
        tags: ['Admin Auth'],
        summary: 'Admin Portal Login',
        description: 'Authenticates admin credentials and issues a JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'admin' },
                  password: { type: 'string', example: 'ramTech604302' }
                },
                required: ['username', 'password']
              }
            }
          }
        },
        responses: {
          200: { description: 'Authenticated successfully, returns token' },
          401: { description: 'Invalid username or password' },
          500: { description: 'Internal Server Error' }
        }
      }
    },
    '/admin/registrations': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Get registrations (paginated, sorted, filtered)',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search Name, Mobile, IMEI, or Model' },
          { name: 'brand', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'sortField', in: 'query', schema: { type: 'string', default: 'created_at' } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', default: 'DESC' } }
        ],
        responses: {
          200: { description: 'Success' },
          401: { description: 'Unauthorized' },
          403: { description: 'Token invalid or expired' }
        }
      }
    },
    '/admin/registrations/{id}': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Get registration details by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        responses: {
          200: { description: 'Success' },
          404: { description: 'Registration not found' }
        }
      },
      put: {
        tags: ['Admin Portal'],
        summary: 'Update registration status',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['New', 'Under Review', 'Contacted', 'Recovery In Progress', 'Recovered', 'Closed'],
                    example: 'Under Review'
                  }
                },
                required: ['status']
              }
            }
          }
        },
        responses: {
          200: { description: 'Status updated successfully' },
          404: { description: 'Registration not found' }
        }
      }
    },
    '/admin/dashboard-stats': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Get Admin dashboard metrics (KPI cards)',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Success' }
        }
      }
    },
    '/admin/export/excel': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Export registrations matching filters to Excel',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Success - downloads Excel workbook' }
        }
      }
    },
    '/admin/export/csv': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Export registrations matching filters to CSV',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Success - downloads CSV file' }
        }
      }
    },
    '/admin/settings': {
      get: {
        tags: ['Admin Portal'],
        summary: 'Get all application configurations',
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Success' }
        }
      },
      put: {
        tags: ['Admin Portal'],
        summary: 'Update a specific application setting',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  key: { type: 'string', example: 'instagram_username' },
                  value: { type: 'string', example: 'god_of_mobiles_real' }
                },
                required: ['key', 'value']
              }
            }
          }
        },
        responses: {
          200: { description: 'Setting updated successfully' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

module.exports = swaggerDocument;
