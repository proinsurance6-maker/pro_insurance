# 🏗️ System Architecture - Insurance Broker Management System

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Database Schema](#database-schema)
3. [API Architecture](#api-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Data Flow](#data-flow)
6. [Security](#security)
7. [Deployment Architecture](#deployment-architecture)

---

## 🎯 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ Sub-Broker   │         │    Admin     │                 │
│  │   Portal     │         │    Panel     │                 │
│  │ (Next.js)    │         │  (Next.js)   │                 │
│  └──────┬───────┘         └──────┬───────┘                 │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
          └────────────┬───────────┘
                       │
          ┌────────────▼───────────────┐
          │   API Gateway / NGINX      │
          │   (Load Balancer)          │
          └────────────┬───────────────┘
                       │
┌──────────────────────┼────────────────────────────────────┐
│                      │    APPLICATION LAYER               │
├──────────────────────┼────────────────────────────────────┤
│                      │                                    │
│  ┌───────────────────▼───────────────────┐               │
│  │     Express.js REST API Server        │               │
│  │         (Node.js + TypeScript)        │               │
│  └───────────────┬───────────────────────┘               │
│                  │                                        │
│         ┌────────┴────────┬──────────┬──────────┐        │
│         ▼                 ▼          ▼          ▼        │
│  ┌────────────┐   ┌────────────┐  ┌───────┐  ┌───────┐  │
│  │   Auth     │   │   Policy   │  │ Comm. │  │Renewal│  │
│  │  Service   │   │  Service   │  │Service│  │Service│  │
│  └────────────┘   └────────────┘  └───────┘  └───────┘  │
│                                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────┐
│                       │       DATA LAYER                  │
├───────────────────────┼───────────────────────────────────┤
│                       │                                   │
│  ┌────────────────────▼──────────────────────┐            │
│  │         PostgreSQL Database               │            │
│  │  (Prisma ORM)                             │            │
│  │                                            │            │
│  │  Tables:                                   │            │
│  │  - insurance_companies                    │            │
│  │  - sub_brokers                            │            │
│  │  - policies                               │            │
│  │  - commissions                            │            │
│  │  - renewals                               │            │
│  │  - commission_rules                       │            │
│  └────────────────────────────────────────────┘            │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                  BACKGROUND SERVICES                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐        ┌───────────────────┐        │
│  │   Cron Jobs      │        │   Email Service   │        │
│  │  (node-cron)     │───────▶│  (Nodemailer/     │        │
│  │                  │        │   SendGrid)       │        │
│  │ - Renewal Check  │        │                   │        │
│  │ - Email Queue    │        │  Templates:       │        │
│  │ - Reports        │        │  - Renewal alerts │        │
│  └──────────────────┘        │  - Commissions    │        │
│                              └───────────────────┘        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### **Entity Relationship Diagram**

```
┌─────────────────────┐
│ insurance_companies │
│─────────────────────│
│ id (PK)             │
│ name                │
│ code                │
│ contact_info        │
│ is_active           │
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────┐
│ commission_rules    │
│─────────────────────│
│ id (PK)             │
│ company_id (FK)     │
│ policy_type         │
│ tier_rules (JSONB)  │
│ effective_from      │
└─────────────────────┘

┌─────────────────────┐
│    sub_brokers      │
│─────────────────────│
│ id (PK)             │
│ broker_code         │
│ name                │
│ email               │
│ password_hash       │
│ role (enum)         │
│ bank_details (JSONB)│
└──────────┬──────────┘
           │
           │ 1:N
           │
┌──────────▼──────────────────┐
│        policies             │
│─────────────────────────────│
│ id (PK)                     │
│ policy_number               │
│ company_id (FK)             │◄────┐
│ sub_broker_id (FK)          │     │ 1:N
│ customer_name               │     │
│ customer_email              │     │
│ policy_type                 │     │
│ premium_amount              │     │
│ start_date                  │     │
│ end_date                    │     │
│ status                      │     │
└────────┬─────────┬──────────┘     │
         │         │                │
         │ 1:N     │ 1:1            │
         │         │                │
    ┌────▼────┐  ┌─▼──────┐        │
    │commiss- │  │renewals│        │
    │ions     │  │────────│        │
    │─────────│  │id (PK) │        │
    │id (PK)  │  │policy_ │        │
    │policy_id│  │id (FK) │        │
    │sub_brok-│  │renewal_│        │
    │er_id(FK)│  │date    │        │
    │company_ │  │status  │        │
    │id (FK)  │──┘        │        │
    │comm_%   │           │        │
    │amount   │           │        │
    │status   │           │        │
    └─────────┘           └────────┘
```

### **Detailed Table Structures**

#### 1. insurance_companies
```sql
CREATE TABLE insurance_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(50) UNIQUE NOT NULL,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. sub_brokers
```sql
CREATE TABLE sub_brokers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broker_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    address TEXT,
    pan_number VARCHAR(10),
    bank_details JSONB,
    role VARCHAR(20) DEFAULT 'sub_broker' CHECK (role IN ('admin', 'sub_broker')),
    is_active BOOLEAN DEFAULT true,
    joining_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. policies
```sql
CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    company_id UUID NOT NULL REFERENCES insurance_companies(id),
    sub_broker_id UUID NOT NULL REFERENCES sub_brokers(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    policy_type VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255),
    sum_assured DECIMAL(15,2),
    premium_amount DECIMAL(10,2) NOT NULL,
    premium_frequency VARCHAR(20) DEFAULT 'yearly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    issue_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    policy_document_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_company (company_id),
    INDEX idx_broker (sub_broker_id),
    INDEX idx_end_date (end_date),
    INDEX idx_status (status)
);
```

#### 4. commissions
```sql
CREATE TABLE commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    sub_broker_id UUID NOT NULL REFERENCES sub_brokers(id),
    company_id UUID NOT NULL REFERENCES insurance_companies(id),
    commission_percentage DECIMAL(5,2) NOT NULL,
    base_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_date DATE,
    payment_method VARCHAR(50),
    transaction_reference VARCHAR(100),
    commission_type VARCHAR(20) DEFAULT 'new_business',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_policy (policy_id),
    INDEX idx_broker (sub_broker_id),
    INDEX idx_status (payment_status)
);
```

#### 5. renewals
```sql
CREATE TABLE renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
    renewal_date DATE NOT NULL,
    reminder_30_days_sent BOOLEAN DEFAULT false,
    reminder_30_days_sent_at TIMESTAMP,
    reminder_15_days_sent BOOLEAN DEFAULT false,
    reminder_15_days_sent_at TIMESTAMP,
    reminder_7_days_sent BOOLEAN DEFAULT false,
    reminder_7_days_sent_at TIMESTAMP,
    reminder_1_day_sent BOOLEAN DEFAULT false,
    reminder_1_day_sent_at TIMESTAMP,
    renewal_status VARCHAR(20) DEFAULT 'pending',
    renewed_at TIMESTAMP,
    renewed_policy_id UUID REFERENCES policies(id),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_policy (policy_id),
    INDEX idx_renewal_date (renewal_date),
    INDEX idx_status (renewal_status)
);
```

#### 6. commission_rules
```sql
CREATE TABLE commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES insurance_companies(id),
    policy_type VARCHAR(50) NOT NULL,
    tier_rules JSONB NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES sub_brokers(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(company_id, policy_type, effective_from)
);
```

---

## 🔌 API Architecture

### **RESTful API Structure**

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /logout
│   ├── POST   /refresh-token
│   └── GET    /me
│
├── /sub-brokers (Admin only)
│   ├── GET    /               (List all)
│   ├── POST   /               (Create)
│   ├── GET    /:id            (Get one)
│   ├── PUT    /:id            (Update)
│   └── DELETE /:id            (Deactivate)
│
├── /companies (Admin only)
│   ├── GET    /               (List all)
│   ├── POST   /               (Create)
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /policies
│   ├── GET    /               (List - filtered by role)
│   ├── POST   /               (Create single)
│   ├── POST   /bulk-upload    (Admin only - CSV/Excel)
│   ├── GET    /:id
│   ├── PUT    /:id
│   └── DELETE /:id
│
├── /commissions
│   ├── GET    /               (List - filtered by role)
│   ├── GET    /summary        (Dashboard stats)
│   ├── GET    /:id
│   └── PUT    /:id/payment    (Admin - mark as paid)
│
├── /renewals
│   ├── GET    /               (List upcoming)
│   ├── GET    /:id
│   └── PUT    /:id/complete   (Mark as renewed)
│
├── /commission-rules (Admin only)
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:companyId/:policyType
│   ├── PUT    /:id
│   └── DELETE /:id
│
└── /reports
    ├── GET    /commission     (Generate commission report)
    ├── GET    /renewals       (Renewal report)
    └── GET    /business       (Business overview)
```

### **API Response Format**

```javascript
// Success Response
{
    "success": true,
    "data": { ... },
    "message": "Operation successful",
    "timestamp": "2024-01-06T10:30:00Z"
}

// Error Response
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid input data",
        "details": [...]
    },
    "timestamp": "2024-01-06T10:30:00Z"
}

// Paginated Response
{
    "success": true,
    "data": [...],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "totalPages": 5
    }
}
```

---

## 🎨 Frontend Architecture

### **Next.js 14 App Structure**

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── policies/
│   │   ├── commissions/
│   │   ├── renewals/
│   │   └── layout.tsx
│   │
│   └── (admin)/
│       ├── admin/
│       │   ├── dashboard/
│       │   ├── sub-brokers/
│       │   ├── companies/
│       │   ├── bulk-upload/
│       │   └── commission-rules/
│       └── layout.tsx
│
├── components/
│   ├── ui/              (shadcn components)
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   └── layouts/
│
├── lib/
│   ├── api/             (API client functions)
│   ├── utils/
│   ├── hooks/
│   └── validations/
│
├── stores/              (Zustand state management)
│   ├── authStore.ts
│   ├── policyStore.ts
│   └── uiStore.ts
│
└── types/
    ├── policy.ts
    ├── commission.ts
    └── user.ts
```

### **Component Hierarchy**

```
App
├── AuthProvider
│   ├── LoginPage
│   └── ProtectedRoute
│       ├── RoleGuard (Admin/Sub-Broker)
│       │   ├── DashboardLayout
│       │   │   ├── Sidebar
│       │   │   ├── Header
│       │   │   └── MainContent
│       │   │       ├── Dashboard
│       │   │       ├── PolicyList
│       │   │       ├── CommissionTracker
│       │   │       └── RenewalCalendar
│       │   │
│       │   └── AdminLayout
│       │       ├── AdminSidebar
│       │       └── AdminContent
│       │           ├── SubBrokerManagement
│       │           ├── BulkUpload
│       │           └── CommissionRules
│       │
│       └── QueryClientProvider (React Query)
```

---

## 🔄 Data Flow

### **1. Policy Creation Flow**

```
User Action → API Request → Backend Processing
                ↓
        ┌───────────────────┐
        │ 1. Create Policy  │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │ 2. Fetch Company  │
        │    Commission     │
        │    Rules          │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │ 3. Calculate &    │
        │    Create         │
        │    Commission     │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │ 4. Create Renewal │
        │    Record         │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │ 5. Send           │
        │    Notification   │
        │    to Sub-Broker  │
        └───────────────────┘
```

### **2. Renewal Email Automation Flow**

```
Daily Cron Job (9 AM)
        │
        ▼
┌───────────────────┐
│ Query Renewals    │
│ WHERE renewal_date│
│ IN (today + 30,   │
│     today + 15,   │
│     today + 7,    │
│     today + 1)    │
└────────┬──────────┘
         │
         ▼
┌────────────────────┐
│ For each renewal:  │
│ - Fetch policy     │
│ - Fetch broker     │
│ - Fetch company    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Prepare Email      │
│ Template with      │
│ Policy Details     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Send Email via     │
│ SendGrid/Nodemailer│
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Update Renewal     │
│ reminder_sent flag │
└────────────────────┘
```

### **3. Bulk Upload Flow**

```
Admin Uploads CSV
        │
        ▼
┌────────────────────┐
│ Parse CSV File     │
│ (Papa Parse)       │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Validate Each Row: │
│ - Company exists   │
│ - Broker exists    │
│ - Required fields  │
│ - Data types       │
└────────┬───────────┘
         │
         ├─── Errors? ───→ Show validation errors
         │
         ▼
┌────────────────────┐
│ Preview Data       │
│ (First 10 rows)    │
└────────┬───────────┘
         │
    Admin confirms
         │
         ▼
┌────────────────────┐
│ Database           │
│ Transaction:       │
│ - Insert policies  │
│ - Insert comms     │
│ - Insert renewals  │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Send Success Email │
│ to Sub-Brokers     │
└────────────────────┘
```

---

## 🔒 Security

### **Authentication & Authorization**

```javascript
// JWT Token Structure
{
    "userId": "uuid",
    "email": "user@example.com",
    "role": "admin" | "sub_broker",
    "brokerCode": "SB001",
    "iat": 1234567890,
    "exp": 1234567890
}

// Middleware Chain
Request
  → CORS Check
  → Rate Limiting
  → JWT Verification
  → Role Check
  → Route Handler
```

### **Security Measures**

1. **Password Security**
   - bcrypt hashing (10 rounds)
   - Minimum 8 characters
   - Password reset via email

2. **API Security**
   - JWT tokens (15min access, 7d refresh)
   - CORS configuration
   - Rate limiting (100 req/15min)
   - Input validation (Zod/Joi)
   - SQL injection prevention (Prisma ORM)

3. **Data Security**
   - Encrypted sensitive data in DB
   - HTTPS only
   - Environment variables for secrets
   - Role-based data access

---

## 🚀 Deployment Architecture

```
┌──────────────────────────────────────────────────┐
│              Production Environment              │
├──────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐          ┌──────────────┐     │
│  │   Vercel     │          │  Railway/    │     │
│  │  (Frontend)  │──────────│  Render      │     │
│  │  Next.js 14  │   API    │  (Backend)   │     │
│  └──────────────┘          └──────┬───────┘     │
│                                   │              │
│                            ┌──────▼───────┐     │
│                            │ PostgreSQL   │     │
│                            │ (Managed)    │     │
│                            └──────────────┘     │
│                                                  │
│  ┌──────────────┐          ┌──────────────┐     │
│  │  SendGrid    │          │   AWS S3     │     │
│  │  (Email)     │          │  (Files)     │     │
│  └──────────────┘          └──────────────┘     │
│                                                  │
└──────────────────────────────────────────────────┘
```

### **Environment Configuration**

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/insurance_db

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email
SENDGRID_API_KEY=your-api-key
EMAIL_FROM=noreply@yourapp.com

# Frontend
NEXT_PUBLIC_API_URL=https://api.yourapp.com

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

---

## 📈 Performance Optimization

1. **Database**
   - Proper indexing on foreign keys
   - Query optimization with Prisma
   - Connection pooling

2. **API**
   - Response caching (Redis)
   - Pagination for large datasets
   - Gzip compression

3. **Frontend**
   - Server-side rendering (Next.js)
   - Image optimization
   - Code splitting
   - React Query for caching

---

## 🔍 Monitoring & Logging

```
Monitoring Stack:
- Application: Sentry (Error tracking)
- Performance: Vercel Analytics
- Database: Railway/Render metrics
- Logs: Winston logger → CloudWatch/Papertrail
- Uptime: UptimeRobot
```

---

This architecture ensures:
✅ Scalability
✅ Security
✅ Maintainability
✅ High Performance
✅ Easy Deployment
