# Setup Guide - Insurance Broker Management System

This guide will help you set up the complete Insurance Broker Management System from scratch.

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **PostgreSQL 14+** installed and running ([Download](https://www.postgresql.org/download/))
- **Git** installed ([Download](https://git-scm.com/))
- A code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Database Setup

#### Install PostgreSQL (Windows)
1. Download PostgreSQL installer from official website
2. Run installer and set a password for the `postgres` user
3. Keep default port `5432`
4. Complete installation

#### Create Database
```bash
# Open PostgreSQL command line (psql)
# Login as postgres user

createdb insurance_db

# Or using psql:
psql -U postgres
CREATE DATABASE insurance_db;
\q
```

### 2. Backend Setup

#### Navigate to Backend Directory
```bash
cd backend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/insurance_db"

# JWT Secrets (Change these to random strings)
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"

# Email Configuration (Gmail Example)
EMAIL_SERVICE="gmail"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-specific-password"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587

# Server Configuration
PORT=5000
NODE_ENV=development
```

#### Setup Gmail App Password (if using Gmail)
1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Generate App Password: Security → App passwords
4. Use this password in EMAIL_PASSWORD

#### Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Run database migrations (creates all tables)
npx prisma migrate dev --name init

# (Optional) Seed sample data
npx prisma db seed
```

#### Start Backend Server
```bash
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
✅ Database connected successfully
⏰ Renewal reminder cron job scheduled
```

### 3. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd ../frontend
```

#### Install Dependencies
```bash
npm install
```

#### Configure Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### Start Frontend Server
```bash
npm run dev
```

You should see:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 4. Access the Application

#### Default Admin Login
```
Email: admin@insurance.com
Password: admin123
```

#### Create Sub-Broker (Admin Panel)
1. Login as admin
2. Navigate to Admin Dashboard
3. Click "Manage Sub-Brokers"
4. Add new sub-broker with credentials

## Project Structure

```
Pro Insurance/
├── backend/
│   ├── src/
│   │   ├── controllers/       # Business logic handlers
│   │   ├── routes/            # API endpoints
│   │   ├── middleware/        # Auth, validation
│   │   ├── services/          # Reusable services
│   │   ├── jobs/              # Cron jobs
│   │   └── index.ts           # Entry point
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── .env                   # Environment variables
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/            # Login pages
│   │   ├── dashboard/         # Sub-broker dashboard
│   │   ├── policies/          # Policy management
│   │   ├── commissions/       # Commission tracking
│   │   ├── renewals/          # Renewal management
│   │   └── admin/             # Admin panel
│   ├── components/            # Reusable components
│   ├── lib/                   # Utilities & API client
│   ├── .env.local             # Environment variables
│   └── package.json
│
├── ROADMAP.md                 # Development phases
├── ARCHITECTURE.md            # System design
└── README.md                  # Project overview
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (Admin only)
- `POST /api/auth/refresh` - Refresh token

### Policies
- `GET /api/policies` - Get all policies
- `POST /api/policies` - Create policy
- `GET /api/policies/:id` - Get policy details
- `PUT /api/policies/:id` - Update policy
- `POST /api/policies/bulk-upload` - Bulk upload (Admin)

### Commissions
- `GET /api/commissions` - Get all commissions
- `GET /api/commissions/summary` - Get summary
- `PUT /api/commissions/:id` - Update payment status

### Renewals
- `GET /api/renewals` - Get all renewals
- `GET /api/renewals/upcoming` - Get upcoming
- `PUT /api/renewals/:id` - Mark as renewed

### Sub-Brokers (Admin only)
- `GET /api/sub-brokers` - Get all brokers
- `POST /api/sub-brokers` - Create broker
- `DELETE /api/sub-brokers/:id` - Delete broker

### Companies (Admin only)
- `GET /api/companies` - Get all companies
- `POST /api/companies` - Create company
- `DELETE /api/companies/:id` - Delete company

### Commission Rules (Admin only)
- `GET /api/commission-rules` - Get all rules
- `POST /api/commission-rules` - Create rule
- `DELETE /api/commission-rules/:id` - Delete rule

## Common Issues & Solutions

### Issue: Cannot connect to database
**Solution**: 
- Check PostgreSQL service is running
- Verify DATABASE_URL in .env
- Ensure database exists: `psql -U postgres -l`

### Issue: Prisma migration fails
**Solution**:
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Or manually drop and recreate
psql -U postgres
DROP DATABASE insurance_db;
CREATE DATABASE insurance_db;
\q

# Then run migrations again
npx prisma migrate dev
```

### Issue: Email sending fails
**Solution**:
- Verify email credentials in .env
- For Gmail, use App Password, not regular password
- Check SMTP settings

### Issue: Port already in use
**Solution**:
```bash
# Find process using port
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <process_id> /F

# Or change port in backend/.env
PORT=5001
```

### Issue: CORS errors
**Solution**:
- Ensure backend is running on port 5000
- Check NEXT_PUBLIC_API_URL in frontend/.env.local
- Verify CORS configuration in backend/src/index.ts

## Testing the Setup

### 1. Test Backend API
```bash
# Using curl or Postman
curl http://localhost:5000/api/health

# Expected response:
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 2. Test Login
1. Go to http://localhost:3000/login
2. Enter admin credentials
3. Should redirect to admin dashboard

### 3. Test Policy Creation
1. Login as sub-broker
2. Go to "Policies" → "Add Policy"
3. Fill form and submit
4. Check database:
```sql
SELECT * FROM policies;
SELECT * FROM commissions;
SELECT * FROM renewals;
```

### 4. Test Renewal Emails
Renewal reminder cron job runs daily at 9 AM. To test immediately:
1. Create a policy with end_date = tomorrow
2. Check email inbox for renewal reminder

## Next Steps

1. **Customize Email Templates**: Edit `backend/src/jobs/renewalReminder.job.ts`
2. **Add More Companies**: Use Admin panel → Manage Companies
3. **Configure Commission Rules**: Admin panel → Commission Rules
4. **Bulk Upload Policies**: Download CSV template, fill data, upload
5. **Deploy to Production**: See deployment guide in ROADMAP.md

## Development Commands

### Backend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npx prisma studio    # Open database GUI
npx prisma migrate dev --name <name>  # Create new migration
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run linter
```

## Support

For issues or questions:
1. Check ROADMAP.md for project status
2. Review ARCHITECTURE.md for system design
3. Check copilot-instructions.md for development guidelines

---

**🎉 Setup Complete! You're ready to start using the Insurance Broker Management System.**
