# Insurance Book SaaS - Copilot Instructions

## Architecture Overview
Multi-tenant SaaS for insurance agents (India-focused). **PostgreSQL + Express 5 backend (port 5000), Next.js 16 + React 19 frontend (port 3000).**

## Role Hierarchy & Data Access

```
ADMIN (Platform Supervisor)
  └── Full platform access, tech support, can view all agents
  
AGENT (Master Agent / Business Owner)
  ├── Owns ALL downstream data (policies, clients, commissions)
  ├── Can create/manage Sub-Agents
  ├── Can create/manage Clients
  └── Sets Sub-Agent commission split percentage

SUB_AGENT (Team Member)
  ├── Works under one Agent
  ├── Can view assigned policies
  ├── Gets commission based on `commissionPercentage` set by Agent
  └── Cannot see other Sub-Agents' data

CLIENT (End Customer)
  ├── Can view own policies only
  ├── Gets renewal notifications
  └── Self-service portal access
```

**Data Visibility Rules:**
- **Admin:** All agents, all platform data
- **Agent:** Only own `agentId` filtered data (clients, policies, sub-agents, commissions)
- **Sub-Agent:** Only policies where `subAgentId` matches
- **Client:** Only policies where `clientId` matches

**Entity Hierarchy** - data isolation enforced at every query:
- `Agent` → Business owner, **owns all downstream data** (enforced via `agentId` filter)
- `SubAgent` → Works under Agent with configurable `commissionPercentage` split
- `Client` → Has optional `FamilyMember` records
- `Policy` → Links Agent, SubAgent?, Client, InsuranceCompany → **auto-creates** `Commission` + `Renewal` records
- `Commission` → Auto-calculated on policy creation, split between Agent/SubAgent
- `Renewal` → Auto-generated with `renewalDate = policy.endDate`

## Development Workflow

### Initial Setup
```bash
# Backend - MUST run Prisma commands before starting
cd backend && npm install
npx prisma generate              # Generate Prisma client
npx prisma migrate dev           # Run migrations
npm run dev                      # Start on localhost:5000

# Frontend
cd frontend && npm install
npm run dev                      # Start on localhost:3000
```

### Schema Changes
```bash
# Edit backend/prisma/schema.prisma, then:
cd backend
npx prisma migrate dev --name descriptive_name  # Creates migration
npx prisma generate                             # Regenerates client types
```

### Production Build
```bash
# Backend: Generates Prisma client + pushes schema + compiles TypeScript
npm run build  # Runs: npx prisma generate && npx prisma db push && tsc

# Frontend
npm run build && npm start
```

## Critical Security Pattern: Multi-Tenancy

**🔒 EVERY agent-owned resource query MUST filter by `agentId`** - this prevents data leaks between agents:

```typescript
// ✅ CORRECT - Always enforce agentId isolation
const policy = await prisma.policy.findFirst({
  where: { id, agentId: (req as any).user.userId }
});

// ❌ WRONG - Never query without agentId for agent resources
const policy = await prisma.policy.findUnique({ where: { id } });
```

**Applied to:** `Policy`, `Client`, `SubAgent`, `Commission`, `Renewal`, `Ledger` (see [policy.controller.ts:12-82](backend/src/controllers/policy.controller.ts))

## Authentication Flow

### Middleware Chain
All protected routes use: `router.use(authenticate, requireAgent)` (see [agent.routes.ts:16](backend/src/routes/agent.routes.ts))

```typescript
// 1. authenticate middleware extracts JWT → req.user
req.user = { userId, role, email?, phone?, agentCode? }

// 2. Role guards check access
requireAgent  // Ensures role === 'AGENT'
requireAdmin  // Ensures role === 'ADMIN'  
requireClient // Ensures role === 'CLIENT'
```

### Frontend Auth Context
```tsx
// lib/auth-context.tsx - provides global auth state
const { user, token, login, logout, isAgent } = useAuth();

// Auto-injects token via axios interceptor (lib/api.ts:12-21)
// Auto-redirects on 401 → clears localStorage + navigates to /login
```

## API Contracts

### Standard Response Format
```typescript
// Success
{ success: true, data: { ...actualData } }

// Error (thrown via AppError)
{ success: false, error: { code: 'NOT_FOUND', message: 'Client not found' } }

// Paginated
{ 
  success: true,
  data: { 
    items: [...], 
    pagination: { page: 1, limit: 20, total: 100, totalPages: 5 } 
  }
}
```

### Error Handling Pattern
```typescript
// Controllers throw AppError → caught by global errorHandler
throw new AppError('Client not found', 404, 'NOT_FOUND');

// errorHandler in middleware/errorHandler.ts converts to standard format
```

## Database Patterns

### Decimal → String Serialization
Prisma `Decimal` types **must** convert to strings before JSON response (Decimal is not JSON-serializable):
```typescript
res.json({
  ...policy,
  premiumAmount: policy.premiumAmount.toString(),
  sumAssured: policy.sumAssured?.toString()
});
```
**Affected fields:** `premiumAmount`, `sumAssured`, `commissionAmount`, `commissionPercentage`

### Naming Conventions
- **Database:** snake_case (`premium_amount`, `agent_id`) via `@@map()` / `@map()`
- **Prisma models:** camelCase (`premiumAmount`, `agentId`)
- **IDs:** UUIDs (`@id @default(uuid()) @db.Uuid`)
- **Soft deletes:** `isActive` boolean (never hard delete agent data)

### Key Enums
```typescript
UserRole: ADMIN | AGENT | SUB_AGENT | CLIENT
TeamMode: SOLO | TEAM
LedgerType: CREDIT | DEBIT
PolicySource: RENEWAL | SWITCH | NEW
PaymentBy: AGENT | SUB_AGENT | CLIENT
MotorPolicyType: COMPREHENSIVE | OD_ONLY | TP_ONLY
```

## Business Logic Patterns

### Motor Policy Commission Calculation
Motor policies have separate OD (Own Damage) and TP (Third Party) commission rates:
```typescript
// COMPREHENSIVE = OD + TP combined
if (motorPolicyType === 'COMPREHENSIVE') {
  odCommission = odPremium * odCommissionRate / 100
  tpCommission = tpPremium * tpCommissionRate / 100
  totalCommission = odCommission + tpCommission
}
// OD_ONLY or TP_ONLY use respective premium/rate
```

### Non-Motor Policy Commission
Other policies use Net Premium for commission calculation:
```typescript
netCommission = netPremium * netCommissionRate / 100
// renewalCommissionRate stored for future renewal calculations
```

### Commission Auto-Calculation & Sub-Agent Split
When creating a policy, commission is **automatically** created via [commission.service.ts:56-84](backend/src/services/commission.service.ts):
```typescript
// If SubAgent involved, split commission:
subAgentAmount = (totalCommission * subAgent.commissionPercentage) / 100
agentAmount = totalCommission - subAgentAmount

// Creates Commission record with both amounts
```

### Renewal Auto-Generation
Every policy auto-creates a `Renewal` record where `renewalDate = policy.endDate` (see policy creation logic)

## Frontend Patterns

### API Client Structure
**All API calls** go through typed functions in [lib/api.ts](frontend/lib/api.ts):
```typescript
// Organized by entity with auto-token injection
authAPI.agentLogin({ phone, pin })
policyAPI.getAll({ page, limit, search })
clientAPI.create(data)
```

### Page Architecture
```tsx
// All pages use 'use client' directive
'use client';

// Standard pattern: useAuth + useEffect fetch
const { user, isAgent } = useAuth();
useEffect(() => {
  fetchData().then(setData);
}, []);
```

### Currency Formatting (India-specific)
```typescript
// Always use INR formatting
new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
// Output: ₹1,23,456.00
```

## Common Tasks

### Add New Endpoint
1. **Route** (`backend/src/routes/`) → define path + middleware
2. **Controller** (`backend/src/controllers/`) → **MUST** filter by `agentId`
3. **Frontend API** (`frontend/lib/api.ts`) → add typed function
4. **Component** → call API function via `useEffect` or event handler

### File Upload Implementation
Uses `multer` with `memoryStorage()` for document uploads:
```typescript
// See backend/src/routes/policy.routes.ts:20-33
const upload = multer({ storage: multer.memoryStorage() });
router.post('/upload', upload.single('file'), handler);
```

### Environment Variables
**Backend:** `DATABASE_URL`, `JWT_SECRET`, `PORT`, email config  
**Frontend:** `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api`)

## Reference Files
- **Multi-tenancy examples:** [policy.controller.ts](backend/src/controllers/policy.controller.ts), [client.controller.ts](backend/src/controllers/client.controller.ts)
- **Auth implementation:** [middleware/auth.ts](backend/src/middleware/auth.ts), [auth.controller.ts](backend/src/controllers/auth.controller.ts)
- **Commission logic:** [services/commission.service.ts](backend/src/services/commission.service.ts)
- **Frontend API client:** [lib/api.ts](frontend/lib/api.ts), [lib/auth-context.tsx](frontend/lib/auth-context.tsx)
- **Database schema:** [prisma/schema.prisma](backend/prisma/schema.prisma)
