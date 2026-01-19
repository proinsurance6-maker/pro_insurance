# Insurance Book SaaS - Copilot Instructions

## Architecture
Multi-tenant SaaS for insurance agents (India). **Backend:** Express 5 + Prisma 6 (port 5000). **Frontend:** Next.js 16 + React 19 (port 3000).

**Tech Stack:** PostgreSQL + Prisma ORM | JWT Auth | Supabase/Cloudinary Storage | node-cron Jobs | Axios + React Query

## � Business Model (CRITICAL - Read First!)
**User = Main Agent = Business Owner** who runs the insurance agency.

**Commission Flow:**
```
Broker (PolicyBazaar) → USER (Main Agent) → Sub-Agent
     [pays commission]     [receives & pays]   [receives payout]
```

**Key Entities:**
- **User/Agent:** Business owner using this software (receives from broker, pays to sub-agent)
- **Broker:** Source of policies (PolicyBazaar, MitPro, Probus) - pays commission TO user
- **Sub-Agent:** Sales partner who brings business - receives commission FROM user
- **User Profit:** `brokerCommission - subAgentPayout`

**Commission Fields:**
- `totalCommissionAmount` - Total received FROM broker (varies per policy)
- `subAgentCommissionAmount` - Amount payable TO sub-agent (USER decides per policy)
- `agentCommissionAmount` - **USER'S PROFIT** (auto-calculated: total - subAgent)

**CRITICAL:** 
- Broker rates vary per policy (PolicyBazaar 15%, MitPro 12%, etc.)
- Sub-agent rates are **NOT fixed** - USER decides rate for EACH policy
- User has full flexibility to set different rates per policy

📖 **See [BUSINESS_MODEL.md](BUSINESS_MODEL.md) for complete details**

## �🔒 CRITICAL: Multi-Tenancy Security
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

**Environment Variables:** Backend needs `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL/SUPABASE_ANON_KEY` (or Cloudinary), email/SMS config. Frontend needs `NEXT_PUBLIC_API_URL`.

## Key Patterns

### API Response Format
```typescript
{ success: true, data: {...} }  // Success
throw new AppError('Not found', 404, 'NOT_FOUND');  // Error → { success: false, error: {...} }
```
See [errorHandler.ts](backend/src/middleware/errorHandler.ts) - all errors use `AppError` class with statusCode + code.

### Decimal Serialization
Prisma `Decimal` → `.toString()` before JSON response (premiumAmount, sumAssured, commissionAmount):
```typescript
policies: policies.map(p => ({
  ...p,
  premiumAmount: p.premiumAmount.toString(),
  commissions: p.commissions.map(c => ({
    ...c,
    totalCommissionAmount: c.totalCommissionAmount.toString()
  }))
}))
```
See [policy.controller.ts#L59-L90](backend/src/controllers/policy.controller.ts) for complete example.

### Authentication Flow
1. **Backend:** Protected routes use `router.use(authenticate, requireAgent)` - see [auth.ts](backend/src/middleware/auth.ts)
2. **Access user:** `(req as any).user.userId` (typed as `AuthRequest` interface)
3. **Frontend:** Axios interceptor auto-adds `Bearer ${token}` header - see [api.ts#L12-L22](frontend/lib/api.ts)
4. **Context:** `useAuth()` hook provides `{user, token, login, logout}` - see [auth-context.tsx](frontend/lib/auth-context.tsx)

**Auth Types:** 
- Agent: PIN (6-digit) + OTP forgot flow (`/auth/agent/signup`, `/auth/agent/login`, `/auth/agent/forgot-pin`)
- Admin: Email + Password (`/auth/admin/login`)
- Client: OTP-only (`/auth/client/send-otp`, `/auth/client/verify-otp`)

### Commission Auto-Generation
Policy creation triggers `createCommissionForPolicy()` in [commission.service.ts](backend/src/services/commission.service.ts):
- Calculates: `totalCommissionAmount = premiumAmount * commissionRate / 100`
- SubAgent split: `subAgentAmount = totalCommission * subAgent.commissionPercentage / 100`
- Motor policies: Separate OD/TP commission rates (`odCommissionPercent`, `tpCommissionPercent`)
- Creates `Commission` record linked to policy + agent + subAgent

### Renewal Auto-Generation & Reminders
- **On Policy Create:** Auto-creates `Renewal` with `renewalDate = policy.endDate` (see policy controller)
- **Cron Job:** [renewalReminder.job.ts](backend/src/jobs/renewalReminder.job.ts) runs daily, sends email reminders at 30/15/7/1 days before renewal
- **Tracks:** `reminder30DaysSent`, `reminder15DaysSent`, etc. flags to prevent duplicate emails

### File Storage (Dual-Provider)
```typescript
// Auto-detects Supabase or falls back to Cloudinary
const uploadPolicyDocuments = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY 
  ? uploadToSupabase 
  : uploadToCloudinary;
```
See [policy.controller.ts#L8-L13](backend/src/controllers/policy.controller.ts). Both services return same `UploadResult` interface.

**Supabase:** Bucket = `policy-documents`, folder structure = `{folder}/{filename}` - see [supabase-storage.service.ts](backend/src/services/supabase-storage.service.ts)

## Adding New Features

### Backend Route → Controller → Service
1. **Route** (`backend/src/routes/*.routes.ts`):
   ```typescript
   router.use(authenticate, requireAgent); // Apply middleware
   router.get('/', getItems);
   router.post('/', createItem);
   ```

2. **Controller** (`backend/src/controllers/*.controller.ts`):
   ```typescript
   export const getItems = async (req: Request, res: Response, next: NextFunction) => {
     try {
       const agentId = (req as any).user.userId; // CRITICAL: Always filter by agentId
       const items = await prisma.item.findMany({ where: { agentId } });
       res.json({ success: true, data: { items } });
     } catch (error) {
       next(error); // Pass to errorHandler
     }
   };
   ```

3. **Service** (optional, for complex logic - see [commission.service.ts](backend/src/services/commission.service.ts))

### Frontend Component → API → Hook
1. **API Client** (`frontend/lib/api.ts`):
   ```typescript
   export const itemAPI = {
     getItems: () => api.get('/items'),
     createItem: (data: any) => api.post('/items', data)
   };
   ```

2. **Component** (`frontend/app/dashboard/items/page.tsx`):
   ```typescript
   'use client';
   import { useAuth } from '@/lib/auth-context';
   import { itemAPI } from '@/lib/api';
   
   export default function ItemsPage() {
     const { user } = useAuth();
     const [items, setItems] = useState([]);
     
     useEffect(() => {
       itemAPI.getItems().then(res => setItems(res.data.data.items));
     }, []);
     
     return <div>{/* UI */}</div>;
   }
   ```

## Database Schema Patterns

### Naming Conventions
- **Database:** `snake_case` columns (e.g., `agent_id`, `created_at`)
- **Prisma:** `camelCase` fields with `@map()` directive:
  ```prisma
  agentId    String   @map("agent_id") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")
  ```

### Common Patterns
- **IDs:** All UUIDs (`@id @default(uuid()) @db.Uuid`)
- **Soft Delete:** `isActive Boolean @default(true)` (never hard delete)
- **Audit Fields:** Every model has `createdAt`, `updatedAt`
- **Foreign Keys:** Always indexed (`@@index([agentId])`)
- **Enums:** Defined in Prisma schema (see [schema.prisma#L15-L67](backend/prisma/schema.prisma))

### Key Models
- `Agent`: Business owner (multi-tenant boundary)
- `SubAgent`: Works under Agent, gets commission split
- `Client`: End customer, self-onboarded via OTP
- `Policy`: Core entity, links to Client + Company + SubAgent + Broker
- `Commission`: Auto-created on policy, tracks splits
- `Renewal`: Auto-created with policy, triggers cron reminders
- `LedgerEntry`: Financial transactions (CREDIT/DEBIT)

See full schema: [prisma/schema.prisma](backend/prisma/schema.prisma)

## Debugging & Common Issues

### Prisma Client Not Generated
**Error:** `Cannot find module '@prisma/client'`  
**Fix:** Run `npx prisma generate` in `backend/` directory before `npm run dev`

### CORS Errors
Backend expects `CORS_ORIGIN` or `FRONTEND_URL` env var. Default allows `http://localhost:3000`.

### Token Expiry Handling
Frontend auto-redirects to `/login` on 401 - see [api.ts#L25-L33](frontend/lib/api.ts) interceptor.

### Background Jobs Not Running
Cron jobs start on server init - see [index.ts](backend/src/index.ts). Check `NODE_ENV` for job scheduling.

## Reference Files
| Pattern | Files |
|---------|-------|
| Multi-tenancy Security | [broker.controller.ts](backend/src/controllers/broker.controller.ts), [policy.controller.ts](backend/src/controllers/policy.controller.ts), [client.controller.ts](backend/src/controllers/client.controller.ts) |
| Auth Middleware | [middleware/auth.ts](backend/src/middleware/auth.ts) |
| Error Handling | [middleware/errorHandler.ts](backend/src/middleware/errorHandler.ts) |
| Commission Logic | [services/commission.service.ts](backend/src/services/commission.service.ts) |
| Renewal Cron | [jobs/renewalReminder.job.ts](backend/src/jobs/renewalReminder.job.ts) |
| Frontend API Client | [lib/api.ts](frontend/lib/api.ts) |
| Auth Context | [lib/auth-context.tsx](frontend/lib/auth-context.tsx) |
| Database Schema | [prisma/schema.prisma](backend/prisma/schema.prisma) |
| Storage Services | [services/supabase-storage.service.ts](backend/src/services/supabase-storage.service.ts), [services/cloudinary.service.ts](backend/src/services/cloudinary.service.ts) |
