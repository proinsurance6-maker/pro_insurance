# Insurance Book SaaS - Copilot Instructions

## Architecture Overview
Multi-tenant SaaS for insurance agents (India-focused). PostgreSQL + Express 5 backend (port 5000), Next.js 16 + React 19 frontend (port 3000).

**Entity Hierarchy** - data isolation enforced at every query:
- `Agent` → Business owner, **owns all downstream data**
- `SubAgent` → Works under Agent with configurable commission split
- `Client` → Has optional `FamilyMember` records
- `Policy` → Links Agent, SubAgent?, Client, InsuranceCompany → auto-creates `Commission` + `Renewal`

## Development Commands
```bash
# Backend
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run dev

# Frontend  
cd frontend && npm install && npm run dev
```

## Critical Patterns

### Multi-Tenancy: Agent Data Isolation
**EVERY agent query MUST filter by agentId** - this is the core security model:
```typescript
// CORRECT - always include agentId filter
const client = await prisma.client.findFirst({ where: { id, agentId: (req as any).user.userId } });

// WRONG - never query without agentId for agent-owned resources
const client = await prisma.client.findUnique({ where: { id } });
```

### Authentication
- JWT via `authenticate` middleware → `req.user: { userId, role, email?, phone?, agentCode? }`
- Role guards: `requireAdmin`, `requireAgent`, `requireClient` in [auth.ts](backend/src/middleware/auth.ts)
- Route protection: `router.use(authenticate, requireAgent)` or per-route

### API Response Contract
```typescript
// Success: { success: true, data: any }
// Error:   { success: false, error: { code, message } }
// Paginated: { data: { items: [], pagination: { page, limit, total, totalPages } } }
```

### Decimal → String Conversion
Prisma `Decimal` fields must convert before JSON response:
```typescript
res.json({ ...policy, premiumAmount: policy.premiumAmount.toString() });
```

### Error Handling
```typescript
throw new AppError('Client not found', 404, 'NOT_FOUND'); // Caught by global errorHandler
```

### Commission Split
Auto-calculated in [commission.service.ts](backend/src/services/commission.service.ts) when SubAgent involved:
```typescript
subAgentAmount = (total * subAgent.commissionPercentage) / 100
```

### Frontend Patterns
- API: [lib/api.ts](frontend/lib/api.ts) - axios with auto token, typed exports (`policyAPI.getAll()`, etc.)
- Auth: `useAuth()` hook → `{ user, login, logout, isAgent }`
- Pages: `'use client'` with `useEffect` data fetching
- Currency: `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`

## Database Conventions
- UUIDs (`@db.Uuid`), snake_case tables (`@@map`)
- Monetary: `Decimal(12,2)`, Percentages: `Decimal(5,2)`
- Soft deletes: `isActive` boolean
- Enums: `UserRole`, `TeamMode`, `LedgerType`, `PolicySource`, `PaymentBy`

## Common Tasks

**Add endpoint:** Route → Controller (filter by agentId!) → Frontend API function

**Modify schema:** `backend/prisma/schema.prisma` → `npx prisma migrate dev --name desc`

**File uploads:** multer + `memoryStorage()`, see [policy.routes.ts](backend/src/routes/policy.routes.ts)
