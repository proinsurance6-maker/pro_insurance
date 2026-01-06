# Deployment Guide - Insurance Broker Management System

This guide covers deployment to popular platforms for production use.

## 📋 Pre-Deployment Checklist

### Backend
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] Seed data prepared (if needed)
- [ ] Email service credentials verified
- [ ] CORS settings updated for production domain
- [ ] API endpoints tested

### Frontend
- [ ] API URL updated to production backend
- [ ] Build tested locally (`npm run build`)
- [ ] Environment variables set
- [ ] No console errors in production build

### Database
- [ ] PostgreSQL database created
- [ ] Connection string secured
- [ ] Backup strategy in place

---

## 🚀 Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend + Database)

#### Step 1: Deploy Database & Backend to Railway

1. **Create Railway Account**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Provision PostgreSQL"
   - Note down the connection string

3. **Deploy Backend**
   ```bash
   # In backend directory
   # Create railway.json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm run start",
       "restartPolicyType": "ON_FAILURE"
     }
   }
   ```

4. **Configure Railway**
   - Connect GitHub repository
   - Select backend folder
   - Add environment variables from `.env.example`
   - Set `DATABASE_URL` to Railway PostgreSQL connection string
   - Set `CORS_ORIGIN` to your Vercel domain
   - Deploy

5. **Run Migrations**
   - In Railway dashboard, open terminal
   - Run: `npx prisma migrate deploy`
   - Run: `npx prisma db seed` (optional)

6. **Note Backend URL**
   - Railway will provide a public URL like: `https://your-app.up.railway.app`

#### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Visit https://vercel.com
   - Sign up with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Select `frontend` as root directory

3. **Configure Build Settings**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`

4. **Add Environment Variables**
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api
   NEXT_PUBLIC_APP_NAME=Insurance Broker Management
   NEXT_PUBLIC_APP_VERSION=1.0.0
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Access your app at: `https://your-app.vercel.app`

---

### Option 2: Render (Full Stack)

#### Step 1: Create Database

1. Go to https://render.com
2. Create PostgreSQL database
3. Note the internal/external connection strings

#### Step 2: Deploy Backend

1. **Create Web Service**
   - New → Web Service
   - Connect repository
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`

2. **Environment Variables**
   - Add all from `.env.example`
   - Use Render's PostgreSQL connection string

3. **Deploy & Migrate**
   - After first deploy, run shell command:
   - `npx prisma migrate deploy`

#### Step 3: Deploy Frontend

1. **Create Static Site**
   - New → Static Site
   - Connect repository
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `.next`

2. **Environment Variables**
   - `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api`

---

### Option 3: DigitalOcean App Platform

#### Step 1: Database Setup

1. Create Managed PostgreSQL Database
2. Note connection details

#### Step 2: Create App

1. Connect GitHub repository
2. Configure Components:

**Backend Component:**
```yaml
name: backend
source:
  repo: your-repo
  branch: main
  path: /backend
build_command: npm install && npx prisma generate && npm run build
run_command: npm start
envs:
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: JWT_SECRET
    value: your-secret
  # ... other env vars
```

**Frontend Component:**
```yaml
name: frontend
source:
  repo: your-repo
  branch: main
  path: /frontend
build_command: npm install && npm run build
run_command: npm start
envs:
  - key: NEXT_PUBLIC_API_URL
    value: ${backend.PUBLIC_URL}/api
```

---

## 🔒 Security Checklist

### Production Environment Variables

**Backend (.env):**
```bash
# Generate strong secrets (minimum 32 characters)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Update CORS origin to your frontend domain
CORS_ORIGIN=https://your-app.vercel.app

# Set production NODE_ENV
NODE_ENV=production
```

**Frontend (.env.local):**
```bash
# Use production backend URL
NEXT_PUBLIC_API_URL=https://your-backend.railway.app/api
```

### SSL/HTTPS
- ✅ Vercel, Railway, Render all provide free SSL
- ✅ Ensure all API calls use HTTPS
- ✅ Set secure cookie flags in production

### Database Security
- ✅ Use managed database service with backups
- ✅ Restrict database access to backend only
- ✅ Use connection pooling
- ✅ Enable SSL for database connections

---

## 🔧 Post-Deployment Tasks

### 1. Test Production Environment

```bash
# Test API health
curl https://your-backend.railway.app/api/health

# Test login
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@insurance.com","password":"admin123"}'
```

### 2. Create Admin Account

```bash
# SSH into backend server or use Railway/Render console
npx prisma db seed

# Or manually create via API
```

### 3. Configure Email Service

**Gmail:**
- Enable 2FA
- Generate App Password
- Update EMAIL_PASSWORD in production

**SendGrid (Recommended for production):**
- Create account at sendgrid.com
- Verify sender email
- Generate API key
- Update EMAIL_SERVICE and SENDGRID_API_KEY

### 4. Set Up Monitoring

**Sentry (Error Tracking):**
```bash
npm install @sentry/node @sentry/nextjs

# Add to backend/src/index.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: process.env.NODE_ENV,
});

# Add to frontend/app/layout.tsx
import * as Sentry from "@sentry/nextjs";
```

**Uptime Monitoring:**
- Use UptimeRobot (free)
- Monitor: `https://your-backend.railway.app/api/health`
- Get alerts for downtime

### 5. Configure Custom Domain (Optional)

**Vercel:**
- Dashboard → Domains → Add Domain
- Update DNS records as instructed
- SSL auto-configured

**Railway:**
- Settings → Domains → Add Custom Domain
- Add CNAME record to DNS
- SSL auto-configured

---

## 📊 Performance Optimization

### Database
```typescript
// backend/src/index.ts
// Add connection pooling
datasources {
  db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
    pool_size = 10
  }
}
```

### API Caching
```typescript
// Add simple in-memory cache for frequently accessed data
const cache = new Map();

export const getCachedCompanies = async () => {
  if (cache.has('companies')) {
    return cache.get('companies');
  }
  const companies = await prisma.insuranceCompany.findMany();
  cache.set('companies', companies);
  setTimeout(() => cache.delete('companies'), 300000); // 5 min TTL
  return companies;
};
```

### Frontend
```json
// next.config.js
module.exports = {
  compress: true,
  images: {
    domains: ['your-cdn.com'],
  },
  poweredByHeader: false,
  reactStrictMode: true,
}
```

---

## 🔄 CI/CD Pipeline (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          # Railway auto-deploys on push

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          # Vercel auto-deploys on push
```

---

## 📝 Deployment Summary

### Recommended Stack for Production:
- **Frontend**: Vercel (Free tier sufficient)
- **Backend**: Railway ($5/month)
- **Database**: Railway PostgreSQL ($5/month)
- **Email**: SendGrid (Free tier: 100 emails/day)
- **Monitoring**: Sentry (Free tier) + UptimeRobot (Free)

**Total Monthly Cost: ~$10**

### Quick Start Commands:

```bash
# Backend deployment
cd backend
npm run build
npx prisma migrate deploy
npm start

# Frontend deployment
cd frontend
npm run build
npm start
```

---

## 🆘 Troubleshooting

### Issue: Build Fails on Vercel
**Solution:** Check Node.js version compatibility
```json
// package.json
"engines": {
  "node": ">=18.0.0"
}
```

### Issue: Database Connection Fails
**Solution:** Check connection string format
```bash
# Correct format:
postgresql://user:password@host:5432/dbname?sslmode=require
```

### Issue: CORS Errors
**Solution:** Update backend CORS_ORIGIN
```typescript
// backend/src/index.ts
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Issue: Cron Job Not Running
**Solution:** Check platform supports background jobs
- Railway: ✅ Supports cron
- Vercel: ❌ Serverless (use external cron service)
- Render: ✅ Supports cron

---

## 🎉 Go Live Checklist

- [ ] Backend deployed and accessible
- [ ] Database created and migrated
- [ ] Frontend deployed and accessible
- [ ] Admin account created
- [ ] Email service configured and tested
- [ ] SSL certificates active
- [ ] Custom domain configured (optional)
- [ ] Monitoring tools active
- [ ] Backups configured
- [ ] Documentation updated with production URLs
- [ ] Team trained on admin panel

**Your Insurance Broker Management System is now LIVE! 🚀**
