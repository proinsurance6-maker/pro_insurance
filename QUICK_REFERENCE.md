# Quick Reference Guide

## 🔑 Default Credentials

### Admin Access
```
Email: admin@insurance.com
Password: admin123
```

### Sub-Broker (After creation by admin)
```
Email: <broker_email>
Password: <set_by_admin>
```

## 🌐 URLs

### Development
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000/api`
- Database GUI: Run `npx prisma studio` in backend

### Key Pages
| Role | Page | URL |
|------|------|-----|
| Both | Login | `/login` |
| Broker | Dashboard | `/dashboard` |
| Broker | Policies | `/policies` |
| Broker | Add Policy | `/policies/new` |
| Broker | Commissions | `/commissions` |
| Broker | Renewals | `/renewals` |
| Broker | Analytics | `/analytics` |
| Broker | Notifications | `/notifications` |
| Admin | Dashboard | `/admin/dashboard` |
| Admin | Brokers | `/admin/brokers` |
| Admin | Companies | `/admin/companies` |
| Admin | Bulk Upload | `/admin/bulk-upload` |
| Admin | Rules | `/admin/commission-rules` |
| Admin | Analytics | `/admin/analytics` |

## 📡 API Endpoints Quick Reference

### Authentication
```typescript
POST   /api/auth/login           // Login
POST   /api/auth/register        // Register new user (admin only)
POST   /api/auth/refresh         // Refresh JWT token
```

### Policies
```typescript
GET    /api/policies             // Get all policies (filtered by role)
POST   /api/policies             // Create new policy
GET    /api/policies/:id         // Get policy by ID
PUT    /api/policies/:id         // Update policy
DELETE /api/policies/:id         // Delete policy
POST   /api/policies/bulk-upload // Bulk upload via CSV (admin only)
```

### Commissions
```typescript
GET    /api/commissions          // Get all commissions
GET    /api/commissions/summary  // Get summary (total, paid, pending)
GET    /api/commissions/:id      // Get commission by ID
PUT    /api/commissions/:id      // Update payment status
```

### Renewals
```typescript
GET    /api/renewals             // Get all renewals
GET    /api/renewals/upcoming    // Get upcoming renewals (next 30 days)
GET    /api/renewals/:id         // Get renewal by ID
PUT    /api/renewals/:id         // Mark as renewed
```

### Sub-Brokers (Admin Only)
```typescript
GET    /api/sub-brokers          // Get all brokers
POST   /api/sub-brokers          // Create broker
GET    /api/sub-brokers/:id      // Get broker by ID
PUT    /api/sub-brokers/:id      // Update broker
DELETE /api/sub-brokers/:id      // Delete broker
```

### Companies (Admin Only)
```typescript
GET    /api/companies            // Get all companies
POST   /api/companies            // Create company
GET    /api/companies/:id        // Get company by ID
PUT    /api/companies/:id        // Update company
DELETE /api/companies/:id        // Delete company
```

### Commission Rules (Admin Only)
```typescript
GET    /api/commission-rules     // Get all rules
POST   /api/commission-rules     // Create rule
GET    /api/commission-rules/:id // Get rule by ID
PUT    /api/commission-rules/:id // Update rule
DELETE /api/commission-rules/:id // Delete rule
```

## 🗃️ Database Tables

### Core Tables
1. **insurance_companies** - Insurance company details
2. **sub_brokers** - Sub-broker accounts and details
3. **policies** - Insurance policies
4. **commissions** - Commission records (auto-created)
5. **renewals** - Renewal tracking (auto-created)
6. **commission_rules** - Commission calculation rules

### Relationships
```
Policy → Commission (1:1)
Policy → Renewal (1:1)
Policy → Company (N:1)
Policy → SubBroker (N:1)
Commission → Company (N:1)
Commission → SubBroker (N:1)
CommissionRule → Company (N:1)
```

## 🔄 Auto-Calculations Flow

### When Creating a Policy
```
1. Policy created
   ↓
2. Fetch commission rule (company + policy type + premium amount)
   ↓
3. Calculate commission (baseAmount × rate)
   ↓
4. Auto-create commission record
   ↓
5. Auto-create renewal record (renewal_date = policy.end_date)
```

### Commission Tier Example
```typescript
// Example commission rule structure
{
  companyId: 1,
  policyType: "health",
  tierRules: [
    { minPremium: 0, maxPremium: 50000, rate: 5 },      // 5% for 0-50k
    { minPremium: 50001, maxPremium: 100000, rate: 7 }, // 7% for 50k-100k
    { minPremium: 100001, maxPremium: null, rate: 10 }  // 10% for >100k
  ]
}
```

## 📧 Email Automation

### Renewal Reminder Schedule
- **30 days before**: First reminder
- **15 days before**: Second reminder
- **7 days before**: Third reminder
- **1 day before**: Final reminder

### Cron Job
- Runs daily at 9:00 AM
- Checks all pending renewals
- Sends emails to sub-brokers
- Updates sent status flags

## 🎨 UI Components

### Using shadcn/ui Components
```typescript
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Button variants
<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
```

### Utility Functions
```typescript
import { formatCurrency, formatDate, cn } from '@/lib/utils';

// Format currency
formatCurrency(50000) // "₹50,000"

// Format date
formatDate("2024-01-01") // "Jan 01, 2024"

// Combine classes
cn("base-class", condition && "conditional-class")
```

## 🛠️ Common Development Tasks

### Add New API Endpoint
1. Create controller in `backend/src/controllers/`
2. Add route in `backend/src/routes/`
3. Register route in `backend/src/index.ts`
4. Add to API client in `frontend/lib/api.ts`

### Add New Page
1. Create page in `frontend/app/<route>/page.tsx`
2. Add navigation link in dashboard
3. Add authentication check if needed

### Modify Database Schema
1. Edit `backend/prisma/schema.prisma`
2. Run `npx prisma migrate dev --name <migration_name>`
3. Run `npx prisma generate`
4. Update TypeScript types if needed

### Add New Commission Rule
1. Login as admin
2. Go to `/admin/commission-rules`
3. Click "Add Rule"
4. Select company and policy type
5. Configure tier structure
6. Save

## 🐛 Debugging

### Check Backend Logs
```bash
cd backend
npm run dev
# Watch console output
```

### Check Database
```bash
cd backend
npx prisma studio
# Opens GUI at http://localhost:5555
```

### API Testing
```bash
# Using curl
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@insurance.com","password":"admin123"}'

# Or use Postman, Thunder Client, etc.
```

### Common Errors

| Error | Solution |
|-------|----------|
| Port 5000 in use | Kill process or change PORT in .env |
| Database connection failed | Check PostgreSQL is running, verify DATABASE_URL |
| JWT token expired | Use refresh token endpoint or re-login |
| CORS error | Verify API_URL in frontend .env.local |
| Prisma client error | Run `npx prisma generate` |

## 📦 NPM Scripts

### Backend
```bash
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm start            # Start production server
npm run seed         # Seed database
```

### Frontend
```bash
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
EMAIL_SERVICE="gmail"
EMAIL_USER="..."
EMAIL_PASSWORD="..."
PORT=5000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 📱 User Workflows

### Sub-Broker: Add Policy
1. Login → Dashboard
2. Click "Policies" → "Add Policy"
3. Fill form:
   - Policy number
   - Select company
   - Customer details
   - Policy type and amount
   - Dates
4. Submit
5. Commission auto-calculated
6. Renewal auto-created

### Admin: Bulk Upload
1. Login → Admin Dashboard
2. Click "Bulk Upload Policies"
3. Download CSV template
4. Fill with policy data
5. Upload file
6. View results (success/errors)

### Sub-Broker: Check Renewals
1. Login → Dashboard
2. Click "Renewals"
3. View upcoming renewals
4. Filter by status
5. Mark as renewed when completed

## 🎯 Quick Tips

1. **Always authenticate**: All API calls (except login) need JWT token
2. **Role matters**: Admin and sub-broker see different data
3. **Auto-creation**: Commission and renewal created automatically with policy
4. **CSV format**: Download template before bulk upload
5. **Tier structure**: Commission rules support multiple tiers
6. **Email reminders**: Sent automatically based on renewal dates
7. **Date format**: Use YYYY-MM-DD in forms and APIs

---

**For detailed documentation, see:**
- `SETUP.md` - Full setup guide
- `ARCHITECTURE.md` - System design
- `ROADMAP.md` - Development phases
- `copilot-instructions.md` - Developer guidelines
