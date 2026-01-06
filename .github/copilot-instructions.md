# Insurance Broker Management System - Copilot Instructions

## Project Overview
Full-stack application for managing insurance policies, sub-brokers, commissions, and automated renewal tracking.

## Technology Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Background Jobs**: node-cron for scheduled tasks
- **Email**: Nodemailer/SendGrid

## Project Structure
```
/
├── backend/               # Express API server
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation, error handling
│   │   ├── services/      # Business logic
│   │   ├── utils/         # Helpers
│   │   └── jobs/          # Cron jobs
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
│
├── frontend/              # Next.js application
│   ├── app/              # App router pages
│   │   ├── (auth)/       # Login pages
│   │   ├── (dashboard)/  # Sub-broker pages
│   │   └── (admin)/      # Admin panel
│   ├── components/       # React components
│   ├── lib/             # Utilities, API clients
│   └── package.json
│
├── ROADMAP.md           # Development phases
└── ARCHITECTURE.md      # System design
```

## Database Schema
Core entities: `insurance_companies`, `sub_brokers`, `policies`, `commissions`, `renewals`, `commission_rules`

**Key Relationships:**
- Policy → Commission (auto-created on policy insert)
- Policy → Renewal (auto-created with policy end_date)
- Commission rules are tiered based on premium ranges

## Key Features & Workflows

### 1. Role-Based Access
- **Admin**: Manage sub-brokers, bulk upload policies, configure commission rules, view all data
- **Sub-Broker**: View own policies, commissions, and renewals only

### 2. Auto-Calculations
When creating a policy:
1. Fetch commission rule from `commission_rules` table
2. Calculate commission based on premium amount and tier
3. Auto-create commission record
4. Auto-create renewal record with `renewal_date = policy.end_date`

### 3. Renewal Email Automation
Daily cron job checks renewals at 30, 15, 7, and 1 day before expiry and sends emails to sub-brokers.

### 4. Bulk Upload (Admin Only)
- Admin uploads CSV with policies
- System validates company codes and broker codes
- Creates policies + commissions + renewals in a transaction

## Development Commands

### Backend
```bash
cd backend
npm install
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Run migrations
npx prisma db seed      # Seed initial data
npm run dev             # Start server (port 5000)
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Start dev server (port 3000)
```

## API Conventions
- All routes use RESTful conventions
- Admin-only routes protected by `adminAuth` middleware
- Sub-broker routes filtered by `req.user.id`
- Response format: `{ success: boolean, data: any, message?: string }`

## Code Patterns

### API Route Example
```typescript
// backend/src/routes/policies.ts
router.post('/', authenticate, async (req, res) => {
  // Create policy
  // Auto-create commission
  // Auto-create renewal
});
```

### Commission Calculation
```typescript
const getCommissionRule = async (companyId, policyType, premiumAmount) => {
  const rules = await prisma.commissionRules.findFirst({
    where: { company_id: companyId, policy_type: policyType }
  });
  
  const tier = rules.tier_rules.find(t => 
    premiumAmount >= t.min_premium && 
    (!t.max_premium || premiumAmount <= t.max_premium)
  );
  
  return tier.rate;
};
```

### Frontend Data Fetching
Use React Query for API calls with automatic caching and refetching.

## Important Notes
- Always validate CSV uploads before batch insert
- Commission rules support tiered structures (stored as JSONB)
- Renewal reminders track sent status to avoid duplicates
- Use Prisma transactions for multi-table operations
- Sub-brokers can only access their own data (enforce in queries)

## Testing
- Unit tests for commission calculations
- Integration tests for API endpoints
- E2E tests for critical flows (login, policy creation, bulk upload)

## Common Tasks
- **Add new policy type**: Update commission_rules and policy validation
- **Modify email template**: Edit `/backend/src/templates/email.html`
- **Add new admin feature**: Create route + add `adminAuth` middleware
- **Change commission logic**: Update `getCommissionRule()` service
