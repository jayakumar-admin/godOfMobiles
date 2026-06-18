# GOD OF Mobiles - Mobile Recovery Service Platform

GOD OF Mobiles is a production-ready, highly optimized, bilingual (English/Tamil) lead generation and recovery tracking platform. It allows users to register lost or stolen mobile devices and assists in tracking, blocking, and recovering them.

The application contains a public website landing page, a secure registrations form, document upload capability, and a fully featured administrative portal to search, filter, update case statuses, and export data in Excel and CSV formats.

---

## Technical Stack

*   **Frontend**: Angular 18+ (Standalone, Routing, Reactive Forms, Signal-based State and Translations, prebuilt Angular Material integration, custom premium CSS themes).
*   **Backend**: Node.js & Express.js REST API service (Helmet security headers, Rate Limiting, CORS, custom file uploads filter with size caps using Multer, JWT + bcrypt auth protection).
*   **Database**: PostgreSQL (UUID key generation, database-level indexes on high-search query attributes).
*   **Containers**: Docker & Docker Compose setup (Multi-stage build compiling frontend and serving it through Nginx, DB health checks, uploads persistence).

---

## Folder Structure

```
GodOfMobiles/
├── backend/
│   ├── config/
│   │   ├── database.js          # DB client pool configuration
│   │   └── swagger.js           # OpenAPI 3.0 specs definitions
│   ├── controllers/
│   │   ├── adminController.js   # Admin auth, listing filtering, settings, exports
│   │   └── registrationController.js  # Registration submit and Instagram mock handler
│   ├── middleware/
│   │   ├── auth.js              # Bearer JWT verification
│   │   ├── upload.js            # Multer validator filters (Invoice, Photo, FIR)
│   │   └── validation.js        # IMEI and mobile number pattern validators
│   ├── routes/
│   │   ├── admin.js             # Protected admin paths
│   │   └── public.js            # Public routes
│   ├── uploads/                 # Storage path for uploads (git-ignored)
│   ├── .env                     # Local environment settings
│   ├── app.js                   # Express application setup
│   ├── server.js                # Database pool connection & programmatic seeder
│   └── package.json             # Backend dependencies
├── database/
│   └── schema.sql               # PostgreSQL tables and indexes SQL
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/      # Route authentication guard
│   │   │   │   ├── interceptors/# JWT injection interceptor
│   │   │   │   └── services/    # Translation signal, public API and Admin API clients
│   │   │   ├── features/
│   │   │   │   ├── home/        # Hero, reviews, counter animations, Instagram feed
│   │   │   │   ├── register/    # Rounded inputs form with validation & uploads
│   │   │   │   ├── success/     # Bilingual success confirmation
│   │   │   │   └── admin/
│   │   │   │       ├── login/   # Secure admin login form
│   │   │   │       └── dashboard/ # Search grids, stats, drawer editor, exports
│   │   │   ├── app.routes.ts    # Lazy components router configuration
│   │   │   └── app.config.ts    # HttpClient and animations providers
│   │   ├── styles.css           # Global theme variables, colors, typography reset
│   │   └── index.html           # Material icons loader and template title
│   ├── proxy.conf.json          # Angular CLI dev-server proxy
│   ├── angular.json             # Budget configurations and proxy settings
│   ├── Dockerfile               # Multi-stage production Docker compilation
│   ├── nginx.conf               # Nginx server configuration with API proxy forwarding
│   └── package.json             # Frontend dependencies
├── docker-compose.yml           # Multi-container orchestration config
└── README.md                    # Setup and operational handbook
```

---

## Database Schema & Indexes

The PostgreSQL database maintains three tables:
1.  `admins`: Holds accounts for administrators.
2.  `mobile_registrations`: Stores the registered lost mobile leads, files paths, and tracking states.
3.  `app_settings`: Contains key-value configuration flags (e.g. the Instagram account username).

**Database Indexes** are established on columns frequently searched or filtered:
*   `mobile_number` and `imei_1`: For direct indexing searches.
*   `status` and `mobile_brand`: For listing table filtering options.
*   `missing_date` and `created_at`: For range filters and sorting configurations.

---

## Security Configurations

*   **JWT Token Authorization**: Encoded with a secret key (`JWT_SECRET`) and expires in 24 hours.
*   **bcrypt Encryption**: Admin passwords are encrypted using bcrypt hashing (rounds = 10).
*   **Helmet Middleware**: Blocks clickjacking, sets strict content types, and isolates origin resources.
*   **CORS Protection**: Access limits configured for API endpoints.
*   **Rate Limiter**: Blocks DDoS or brute force login attempts (max 100 requests per 15 minutes per IP).
*   **Multer File Restrictions**: Limit file uploads to 5MB and accept only valid extensions:
    *   Invoices: `.pdf`, `.jpg`, `.jpeg`, `.png`
    *   Device Photo: `.jpg`, `.jpeg`, `.png`
    *   FIR copy: `.pdf`, `.jpg`, `.jpeg`, `.png`

---

## Local Setup Instructions (Without Docker)

### Prerequisites
*   Node.js (v18+)
*   npm (v9+)
*   PostgreSQL running locally

### Step 1: Database Initialization
Create a PostgreSQL database named `godofmobiles` (or a custom name). Run the SQL commands in `database/schema.sql` to initialize tables, or rely on the backend startup script which automatically runs the initialization schema.

### Step 2: Configure Environment
Create a `.env` file inside the `backend` folder (you can copy `.env.example`):
```env
PORT=3000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=godofmobiles
DB_PORT=5432
JWT_SECRET=your_custom_secure_jwt_secret_string
ADMIN_DEFAULT_PASSWORD=ramTech604302
```

### Step 3: Start Backend API Server
Navigate to the `backend` directory, install packages, and run in dev mode:
```bash
cd backend
npm install
npm run dev
```
*The server will verify DB credentials, initialize table entities, seed the default admin (if not existing), and start listening on port 3000.*

### Step 4: Start Frontend Client
Open a new terminal window, navigate to the `frontend` directory, install packages, and start:
```bash
cd frontend
npm install
npm start
```
*The client dev server will run on `http://localhost:4200` and proxy all `/api` and `/uploads` requests automatically to the backend on `http://localhost:3000`.*

---

## Containerized Setup (Using Docker Compose)

The easiest way to run the entire stack in production-like configuration.

1.  Verify Docker Desktop is active on your host.
2.  Navigate to the project root directory.
3.  Run:
    ```bash
    docker-compose up --build -d
    ```
4.  Docker will download PostgreSQL 16, build the backend Node application, build the Angular production assets, copy them to Nginx, and launch.
5.  Access the landing page at `http://localhost` (Port 80).
6.  Access the Swagger API Docs at `http://localhost:3000/api-docs` (Backend Port 3000).

*To stop the containers: `docker-compose down -v`.*

---

## Administration Portal Credentials

*   **URL**: `http://localhost/admin` (or `http://localhost:4200/admin` in dev mode)
*   **Seeded Username**: `admin`
*   **Seeded Password**: `ramTech604302` *(configurable via ADMIN_DEFAULT_PASSWORD environment variable before seed run)*

---

## REST API Specification

### Public API Endpoints
*   `POST /api/registrations`: Creates a registration. Consumes `multipart/form-data` containing:
    *   `name`, `mobile_number`, `alternative_mobile_number` (optional), `email` (optional).
    *   `imei_1`, `imei_2` (optional), `mobile_brand`, `mobile_model`, `missing_date`, `missing_location`.
    *   `police_complaint_no` (optional), `incident_description` (optional), `consent` (boolean string).
    *   `invoice_file` (File, PDF/PNG/JPG).
    *   `mobile_photo` (File, PNG/JPG, optional).
    *   `fir_file` (File, PDF/PNG/JPG, optional).
*   `GET /api/instagram-feed`: Fetches the dynamic feed of the configured Instagram account username.

### Protected Admin Endpoints *(Header: Authorization: Bearer <JWT_TOKEN>)*
*   `POST /api/admin/login`: Authenticates user credentials.
*   `GET /api/admin/registrations`: Retrieves registrations using filtering parameters:
    *   `search`: Case-insensitive search on name, mobile, IMEI, model.
    *   `brand`, `status`: Specific filter matches.
    *   `startDate`, `endDate`: ISO date bounds filters.
    *   `sortField`, `sortOrder`: Sorting options.
    *   `page`, `limit`: Pagination parameters.
*   `GET /api/admin/registrations/:id`: Detailed case viewer.
*   `PUT /api/admin/registrations/:id`: Modifies case status. Body: `{ "status": "Under Review" }`.
*   `GET /api/admin/export/excel`: Exports all filtered cases (unpaginated) into a styled `.xlsx` file using `exceljs`.
*   `GET /api/admin/export/csv`: Exports all filtered cases into a `.csv` file.
*   `GET /api/admin/settings`: Retrieves app configurations.
*   `PUT /api/admin/settings`: Updates dynamic configurations. Body: `{ "key": "instagram_username", "value": "new_username" }`.

---

## Production Deployment Checklist

1.  **Change Default Password**: Change the seeded admin password by inserting an encrypted password row in PostgreSQL database.
2.  **Environment Credentials**: Ensure the `.env` settings use secure hosts, production ports, and complex random keys for `JWT_SECRET`.
3.  **Cross-Origin Settings (CORS)**: Restrict origin bounds in `backend/app.js` to only allow requests from the domain hosting the frontend.
4.  **Static Storage**: Connect the uploaded files storage (`uploads` folder) to persistent volumes or a CDN/Object storage solution (like GCP Cloud Storage) for scalable multi-instance setups.
5.  **HTTPS**: Deploy an SSL certificate (using certbot/Let's Encrypt) to terminate traffic on Nginx (port 443) to secure JWT token headers and user uploads in transit.
