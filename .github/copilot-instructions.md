# Insurance Book SaaS - Copilot Instructions

## Architecture
Multi-tenant SaaS for insurance agents (India). **Backend:** Express 5 + Prisma 6 (port 5000). **Frontend:** Next.js 16 + React 19 (port 3000).

## 🔒 CRITICAL: Multi-Tenancy Security
**Every agent-owned query MUST filter by `agentId`** to prevent cross-tenant data leaks:
```typescript
// ✅ CORRECT - see broker.controller.ts, policy.controller.ts
const data = await prisma.policy.findFirst({ where: { id, agentId: (req as any).user.userId } });
// ❌ WRONG - never query without agentId
const data = await prisma.policy.findUnique({ where: { id } });
```
**Applies to:** `Policy`, `Client`, `SubAgent`, `Broker`, `Commission`, `Renewal`, `LedgerEntry`

## Development Setup
```bash
# Backend (MUST generate Prisma client first)
cd backend && npm install && npx prisma generate && npx prisma migrate dev && npm run dev

# Frontend
cd frontend && npm install && npm run dev
```

## Key Patterns

### API Response Format
```typescript
{ success: true, data: {...} }  // Success
throw new AppError('Not found', 404, 'NOT_FOUND');  // Error → { success: false, error: {...} }
```

### Decimal Serialization
Prisma `Decimal` → `.toString()` before JSON response (premiumAmount, sumAssured, commissionAmount)

### Authentication
Protected routes use `router.use(authenticate, requireAgent)`. Access user via `(req as any).user.userId`.

### Commission Logic (services/commission.service.ts)
- Policy creation auto-creates `Commission` record
- SubAgent split: `subAgentAmount = totalCommission * subAgent.commissionPercentage / 100`
- Motor policies: separate OD/TP commission rates

### Renewal Generation
Policy creation auto-creates `Renewal` with `renewalDate = policy.endDate`. Cron job sends reminders at 30/15/7/1 days.

## Adding New Features
1. **Route** (`backend/src/routes/`) → path + `authenticate, requireAgent` middleware
2. **Controller** (`backend/src/controllers/`) → **MUST filter by agentId**
3. **Frontend API** (`frontend/lib/api.ts`) → typed function
4. **Component** → call API via `useAuth()` + `useEffect`

## Database
- snake_case columns → camelCase Prisma fields (via `@map`)
- UUIDs for all IDs
- Soft delete via `isActive` boolean
- Key enums: `UserRole`, `PolicySource`, `MotorPolicyType`

## Reference Files
| Pattern | Files |
|---------|-------|
| Multi-tenancy | broker.controller.ts, policy.controller.ts, client.controller.ts |
| Auth | middleware/auth.ts |
| Commission | services/commission.service.ts |
| Frontend API | lib/api.ts, lib/auth-context.tsx |
| Schema | prisma/schema.prisma |
