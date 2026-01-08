# 🗺️ Insurance Book App - Development Roadmap

## 📋 Project Overview
SaaS platform for Insurance Agents to manage their complete business including policies, commissions, clients, and sub-agents.

**Revenue Model:** ₹100/month (First 60 days free trial)

---

## 🎯 Phase 1: Foundation & Database Setup
**Duration:** Day 1

### 1.1 Database Schema ✅
- [x] New Prisma schema with all models
- [ ] Push schema to production database
- [ ] Create seed data for testing

### 1.2 Environment Configuration
- [ ] Backend .env setup
- [ ] Frontend .env setup
- [ ] SMS Gateway API keys (for OTP)

---

## 🎯 Phase 2: Authentication System (OTP Based)
**Duration:** Day 2-3

### 2.1 Agent Authentication
- [ ] Send OTP API (Twilio/MSG91)
- [ ] Verify OTP & Create Session
- [ ] Agent Signup with Team Mode selection
- [ ] Auto-create 60-day trial subscription
- [ ] JWT token generation

### 2.2 Client Authentication
- [ ] Client self-registration (linked to Agent)
- [ ] OTP verification for clients
- [ ] Client login flow

### 2.3 Admin Authentication
- [ ] Admin login (email/password)
- [ ] Admin dashboard access

---

## 🎯 Phase 3: Agent Dashboard & Core Features
**Duration:** Day 4-6

### 3.1 Agent Profile
- [ ] Profile setup (PAN, Aadhaar, Bank details)
- [ ] Team mode toggle (Solo/Team)
- [ ] Subscription status display

### 3.2 Sub-Agent Management (Team Mode)
- [ ] Add sub-agent
- [ ] Set commission percentage
- [ ] View sub-agent ledger balance
- [ ] Sub-agent list with stats

### 3.3 Client Management
- [ ] Add client manually
- [ ] View client list
- [ ] Client pending amount tracker
- [ ] Client profile with family members

---

## 🎯 Phase 4: Policy Management
**Duration:** Day 7-9

### 4.1 Policy Entry
- [ ] Add new policy form
- [ ] Select policy source (New/Renewal/Switch)
- [ ] Link to client & family member
- [ ] Premium paid by (Agent/SubAgent/Client)
- [ ] Auto-create commission entry
- [ ] Auto-create renewal reminder

### 4.2 Policy Listing
- [ ] Filter by company, type, status
- [ ] Search by policy number, client name
- [ ] Bulk policy upload (CSV)

### 4.3 Motor Policy Special Fields
- [ ] Vehicle number tracking
- [ ] RC document linking

---

## 🎯 Phase 5: Smart Ledger (Khata System)
**Duration:** Day 10-12

### 5.1 Ledger Logic
- [ ] Auto-entry when Agent pays premium for SubAgent
- [ ] Negative balance tracking
- [ ] Auto-adjust on next policy
- [ ] Client pending amount tracking

### 5.2 Ledger Views
- [ ] Sub-agent wise ledger
- [ ] Client wise ledger
- [ ] Date range filtering
- [ ] Export to PDF/Excel

### 5.3 Settlement
- [ ] Mark payment received
- [ ] Mark payment made
- [ ] Transaction reference tracking

---

## 🎯 Phase 6: Commission Management
**Duration:** Day 13-14

### 6.1 Commission Calculation
- [ ] Auto-split between Agent & SubAgent
- [ ] Company-wise commission rules
- [ ] Policy type wise rates

### 6.2 Commission Tracking
- [ ] Received from company toggle
- [ ] Paid to sub-agent toggle
- [ ] Commission statement generation

---

## 🎯 Phase 7: Document Management (Cloud Vault)
**Duration:** Day 15-16

### 7.1 Document Upload
- [ ] Cloudinary/S3 integration
- [ ] Upload Aadhaar, PAN, RC
- [ ] Policy PDF storage
- [ ] File size & type validation

### 7.2 Document Organization
- [ ] Client wise folders
- [ ] Family member wise grouping
- [ ] Policy document linking

---

## 🎯 Phase 8: Renewal Management
**Duration:** Day 17-18

### 8.1 Renewal Reminders
- [ ] 30, 15, 7, 1 day before alerts
- [ ] Email reminders
- [ ] In-app notifications

### 8.2 WhatsApp Integration
- [ ] WhatsApp Business API setup
- [ ] Renewal reminder messages
- [ ] PDF statement sharing
- [ ] One-click message send

### 8.3 Renewal Actions
- [ ] Mark as renewed (same company)
- [ ] Mark as switched (new company)
- [ ] Link to new policy

---

## 🎯 Phase 9: Reconciliation Engine (Pro Feature)
**Duration:** Day 19-20

### 9.1 Statement Upload
- [ ] Upload company commission statement
- [ ] Parse statement data

### 9.2 Matching & Disputes
- [ ] Match with app data
- [ ] Highlight differences
- [ ] Mark disputes
- [ ] Track resolution

---

## 🎯 Phase 10: Client Portal
**Duration:** Day 21-22

### 10.1 Client Self-Onboarding
- [ ] Client signup with OTP
- [ ] Upload own documents
- [ ] Add family members
- [ ] Upload family documents

### 10.2 Client Dashboard
- [ ] View own policies
- [ ] Pending premium amount
- [ ] Renewal reminders
- [ ] Download policy documents

---

## 🎯 Phase 11: Admin Panel
**Duration:** Day 23-24

### 11.1 Admin Dashboard
- [ ] Total agents count
- [ ] Total subscription revenue
- [ ] Market business volume
- [ ] Growth analytics

### 11.2 Agent Management
- [ ] View all agents
- [ ] Subscription status
- [ ] Activate/Deactivate agents

---

## 🎯 Phase 12: Subscription & Payments
**Duration:** Day 25-26

### 12.1 Trial Management
- [ ] 60-day trial countdown
- [ ] Trial expiry warnings
- [ ] Feature restrictions after expiry

### 12.2 Payment Integration
- [ ] Razorpay/Paytm integration
- [ ] ₹100/month subscription
- [ ] Payment success/failure handling
- [ ] Invoice generation

---

## 🎯 Phase 13: Testing & Deployment
**Duration:** Day 27-30

### 13.1 Testing
- [ ] API testing
- [ ] Frontend testing
- [ ] Mobile responsiveness
- [ ] WhatsApp integration testing

### 13.2 Production Deployment
- [ ] Backend on Render
- [ ] Frontend on Vercel
- [ ] Database migration
- [ ] SSL & Domain setup

---

## 🛠️ Environment Variables Required

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# SMS Gateway (Choose one)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# OR MSG91
MSG91_AUTH_KEY=
MSG91_TEMPLATE_ID=
MSG91_SENDER_ID=

# WhatsApp Business API
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
WHATSAPP_PHONE_ID=

# File Upload
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payment Gateway
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# Email
EMAIL_SERVICE=gmail
EMAIL_USER=
EMAIL_PASSWORD=

# App Config
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://your-frontend.vercel.app
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_APP_NAME=Insurance Book
```

---

## 📊 Progress Tracker

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | 🔄 In Progress | 50% |
| Phase 2: Authentication | ⏳ Pending | 0% |
| Phase 3: Agent Dashboard | ⏳ Pending | 0% |
| Phase 4: Policy Management | ⏳ Pending | 0% |
| Phase 5: Smart Ledger | ⏳ Pending | 0% |
| Phase 6: Commission | ⏳ Pending | 0% |
| Phase 7: Documents | ⏳ Pending | 0% |
| Phase 8: Renewals | ⏳ Pending | 0% |
| Phase 9: Reconciliation | ⏳ Pending | 0% |
| Phase 10: Client Portal | ⏳ Pending | 0% |
| Phase 11: Admin Panel | ⏳ Pending | 0% |
| Phase 12: Subscription | ⏳ Pending | 0% |
| Phase 13: Deployment | ⏳ Pending | 0% |

---

## 🚀 Let's Start!

**Current Step:** Phase 1.1 - Database Setup
