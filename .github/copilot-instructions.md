# Insurance Book SaaS - Copilot Instructions

## Architecture Overview
Multi-tenant SaaS platform for insurance agents. Three-tier architecture with clear data isolation per agent.

**Core Entities & Hierarchy:**
- `Admin` → Platform supervisors
- `Agent` → Business owners (solo or with team) - owns all downstream data
- `SubAgent` → Works under an Agent with configurable commission split
- `Client` → End customers with optional `FamilyMember` records
- `Policy` → Links Agent, SubAgent (optional), Client, and InsuranceCompany

**Data Flow on Policy Creation** (see [policy.controller.ts](backend/src/controllers/policy.controller.ts)):
1. Validate client belongs to agent: `prisma.client.findFirst({ where: { id: clientId, agentId } })`
2. Create policy with all relationships
3. Auto-create `Commission` record via [commission.service.ts](backend/src/services/commission.service.ts)
4. Auto-create `Renewal` record with `renewalDate = policy.endDate`

## Development Commands
```bash
# Backend (port 5000)
cd backend && npm install
npx prisma generate && npx prisma migrate dev
npm run dev

# Frontend (port 3000)
cd frontend && npm install && npm run dev
```

## Critical Patterns

### Authentication & Authorization
- JWT auth via `authenticate` middleware - extracts `userId`, `role` from token
- Role guards: `requireAdmin`, `requireAgent`, `requireClient` in [auth.ts](backend/src/middleware/auth.ts)
- **All agent queries MUST filter by agentId**: `where: { agentId: (req as any).user.userId }`
- User type in `AuthRequest.user`: `{ userId, email?, phone?, role, agentCode? }`

### API Response Format
All endpoints return: `{ success: boolean, data: any, message?: string }`
Pagination: `{ data: { items: [], pagination: { page, limit, total, totalPages } } }`

### Decimal Handling
Prisma returns `Decimal` objects for monetary fields. Convert before JSON response:
```typescript
premiumAmount: policy.premiumAmount.toString()
```

### Commission Split Logic
When SubAgent is involved, commission splits by `subAgent.commissionPercentage`:
```typescript
subAgentCommissionAmount = (totalCommission * subAgentPercentage) / 100
agentCommissionAmount = totalCommission - subAgentCommissionAmount
```

### Frontend API Layer
Centralized in [lib/api.ts](frontend/lib/api.ts) - axios with token interceptor. Use typed API objects:
- `authAPI.sendAgentOTP()`, `authAPI.verifyAgentOTP()`
- `agentAPI.getDashboard()`, `policyAPI.getAll()`, `clientAPI.create()`

Auth state via `useAuth()` hook from [auth-context.tsx](frontend/lib/auth-context.tsx)

### Renewal Automation
Daily cron job in [renewalReminder.job.ts](backend/src/jobs/renewalReminder.job.ts) checks for policies expiring at 30/15/7/1 days. Tracks sent status per reminder (`reminder30DaysSent`, etc.) to prevent duplicates.

## Database Conventions
- UUIDs for all IDs (`@db.Uuid`)
- Snake_case table/column names via `@@map`/`@map`
- Monetary: `Decimal(12,2)`, Percentages: `Decimal(5,2)`
- Soft deletes via `isActive` boolean, not hard deletes
- Key enums: `UserRole`, `TeamMode`, `LedgerType`, `PolicySource`, `PaymentBy`

## Common Tasks

**Add new API endpoint:**
1. Add route in `backend/src/routes/{entity}.routes.ts`
2. Add controller in `backend/src/controllers/{entity}.controller.ts`
3. Add API function in `frontend/lib/api.ts`

**Modify schema:**
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Update related controllers/services

**Add protected admin route:**
```typescript
router.post('/admin-action', authenticate, requireAdmin, controller);
```
