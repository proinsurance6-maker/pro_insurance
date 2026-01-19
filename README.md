# 🏢 Insurance Book - Insurance Agent Management System

A comprehensive SaaS platform for insurance agents in India to manage their business, policies, sub-agents, commissions, and automated renewals.

## 💼 Business Model

**Target User:** Insurance agents who run their own insurance agency

**Key Relationships:**
- **Broker → User:** User receives commission from brokers (PolicyBazaar, MitPro, Probus)
- **User → Sub-Agent:** User pays commission to sub-agents who bring business
- **User Profit:** Difference between broker commission and sub-agent payout

For detailed business model, see [BUSINESS_MODEL.md](BUSINESS_MODEL.md)

## 📋 Features

### For Master Agents (Business Owners)
- 📊 Dashboard with business metrics (revenue, expenses, profit)
- 📝 Policy management (create, track, update)
- 💰 Commission tracking (received from brokers, paid to sub-agents)
- 👥 Sub-agent management with individual ledgers
- 🔔 Automated renewal reminders
- 📈 Financial reports and analytics
- 📒 Smart Ledger (Hisab-Kitab) with 3-tab view

### For Sub-Agents (via separate login)
- 📊 Personal dashboard with their commission earnings
- 📝 View policies they brought
- 💰 Track pending and paid commissions
- 🔔 Renewal notifications

### Automated Features
- ✅ Auto-calculation of commissions (broker and sub-agent splits)
- ✅ Auto-generation of renewal records
- ✅ Automated renewal reminder emails (30, 15, 7, 1 days before expiry)
- ✅ Multi-tenant data isolation for security

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Email**: Nodemailer / SendGrid
- **Cron Jobs**: node-cron
- **File Upload**: Multer
- **CSV Parsing**: csv-parse

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "Pro Insurance"
```

2. **Backend Setup**
```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database and email credentials

# Setup database
npx prisma generate
npx prisma migrate dev

# (Optional) Seed with sample data
npx prisma db seed

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

3. **Frontend Setup**
```bash
cd ../frontend
npm install

# Start frontend dev server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
Pro Insurance/
├── backend/                    # Express.js API server
│   ├── prisma/
│   │   └── schema.prisma      # Database schema
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, validation, errors
│   │   ├── services/         # Business logic
│   │   ├── jobs/             # Cron jobs
│   │   ├── utils/            # Helpers
│   │   └── index.ts          # Entry point
│   ├── .env                  # Environment config
│   └── package.json
│
├── frontend/                  # Next.js application
│   ├── app/                  # App router pages
│   │   ├── (auth)/          # Login pages
│   │   ├── (dashboard)/     # Sub-broker pages
│   │   └── (admin)/         # Admin panel
│   ├── components/          # React components
│   ├── lib/                 # Utilities, API clients
│   └── package.json
│
├── .github/
│   └── copilot-instructions.md  # AI assistant guidelines
├── ROADMAP.md               # Development phases
├── ARCHITECTURE.md          # System design
└── README.md               # This file
```

## 🗄️ Database Schema

### Core Entities

- **insurance_companies** - Insurance providers
- **sub_brokers** - Users (Admin and Sub-Broker roles)
- **policies** - Insurance policies
- **commissions** - Auto-generated commission records
- **renewals** - Auto-generated renewal reminders
- **commission_rules** - Tiered commission configuration

### Key Relationships
- `Policy` → `Commission` (auto-created on policy insert)
- `Policy` → `Renewal` (auto-created with `renewalDate = policy.endDate`)
- `CommissionRule` defines tiered rates based on premium ranges

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed ERD.

## 🔐 Authentication & Authorization

### Roles
- **ADMIN**: Full access to system (manage brokers, companies, bulk upload, reports)
- **SUB_BROKER**: Limited access (own policies, commissions, renewals only)

### Authentication Flow
1. User logs in with email/password
2. Server validates and returns JWT token
3. Token includes: `userId`, `email`, `role`, `brokerCode`
4. Frontend stores token and includes in all API requests
5. Backend middleware verifies token and enforces role-based access

## 📧 Email Automation

### Renewal Reminders
Cron job runs daily at 9 AM to check renewals and send emails:

- **30 days before**: First reminder
- **15 days before**: Second reminder  
- **7 days before**: Urgent reminder
- **1 day before**: Final reminder

Email includes policy details, customer info, and renewal date.

## 📊 Commission Calculation

### Tiered Structure Example
```json
{
  "company_id": "hdfc-ergo",
  "policy_type": "health",
  "tier_rules": [
    { "min_premium": 0, "max_premium": 10000, "rate": 10 },
    { "min_premium": 10001, "max_premium": 50000, "rate": 15 },
    { "min_premium": 50001, "max_premium": null, "rate": 20 }
  ]
}
```

When a policy is created with premium ₹25,000, the system:
1. Fetches the commission rule for the company and policy type
2. Finds the applicable tier (₹10,001-₹50,000 → 15%)
3. Calculates commission: ₹25,000 × 15% = ₹3,750
4. Auto-creates commission record with status "pending"

## 📤 Bulk Upload

Admins can upload CSV files with policies:

### CSV Format
```csv
policy_number,company_code,sub_broker_code,customer_name,customer_email,policy_type,premium_amount,start_date,end_date,sum_assured
HDFC/HLT/001,HDFC_ERGO,SB001,John Doe,john@example.com,health,15000,2024-01-01,2025-01-01,500000
```

System validates:
- Company code exists
- Sub-broker code exists
- Required fields present
- No duplicate policy numbers

On success, creates policies + commissions + renewals in a single transaction.

## 🧪 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Authentication
All protected endpoints require Bearer token:
```
Authorization: Bearer <JWT_TOKEN>
```

### Key Endpoints

**Auth**
- `POST /auth/login` - Login
- `GET /auth/me` - Get current user

**Policies**
- `GET /policies` - List policies (filtered by role)
- `POST /policies` - Create policy
- `POST /policies/bulk-upload` - Bulk upload (Admin)

**Commissions**
- `GET /commissions` - List commissions
- `GET /commissions/summary` - Dashboard stats

**Renewals**
- `GET /renewals` - Upcoming renewals
- `PUT /renewals/:id/complete` - Mark as renewed

See [backend/README.md](./backend/README.md) for complete API reference.

## 🎯 Development Roadmap

See [ROADMAP.md](./ROADMAP.md) for detailed development phases.

**Current Status**: Phase 2 - Backend Development ✅

**Next Steps**:
- Phase 3: Frontend Development 🚧
- Phase 4: Advanced Features
- Phase 5: Testing & Deployment

## 🧑‍💻 Development

### Adding a New Feature

1. **Database**: Update `backend/prisma/schema.prisma`
2. **Migration**: Run `npx prisma migrate dev`
3. **Backend**:
   - Create controller in `backend/src/controllers/`
   - Create routes in `backend/src/routes/`
   - Register in `backend/src/index.ts`
4. **Frontend**:
   - Create components in `frontend/components/`
   - Add pages in `frontend/app/`
   - Create API client functions

### Code Standards

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for components
- **Database**: snake_case for table/column names
- **API**: RESTful conventions

## 🚢 Deployment

### Backend
Recommended platforms:
- Railway
- Render
- AWS EC2
- DigitalOcean

### Frontend
Recommended platforms:
- Vercel (optimized for Next.js)
- Netlify
- AWS Amplify

### Database
- Supabase (PostgreSQL)
- Railway
- AWS RDS
- DigitalOcean Managed Database

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

ISC

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [backend/README.md](./backend/README.md) for API details

---

**Built with ❤️ for Insurance Brokers**
