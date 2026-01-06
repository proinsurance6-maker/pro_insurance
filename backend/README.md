# Insurance Broker Management System - Backend API

Backend REST API for managing insurance policies, sub-brokers, commissions, and renewals.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Email**: Nodemailer
- **Cron Jobs**: node-cron

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `JWT_REFRESH_SECRET`: Secret for refresh tokens
- `EMAIL_FROM`: Sender email address
- `SMTP_USER` / `SMTP_PASS`: Email credentials (or use SendGrid)

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed database with sample data
npx prisma db seed
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register new user
- `GET /api/auth/me` - Get current user

### Policies
- `GET /api/policies` - List policies (filtered by role)
- `POST /api/policies` - Create policy
- `POST /api/policies/bulk-upload` - Bulk upload (Admin only)
- `GET /api/policies/:id` - Get policy details
- `PUT /api/policies/:id` - Update policy
- `DELETE /api/policies/:id` - Delete policy

### Commissions
- `GET /api/commissions` - List commissions
- `GET /api/commissions/summary` - Get commission summary
- `PUT /api/commissions/:id/payment` - Update payment status

### Renewals
- `GET /api/renewals` - List upcoming renewals
- `GET /api/renewals/:id` - Get renewal details
- `PUT /api/renewals/:id/complete` - Mark as renewed

### Sub-Brokers (Admin Only)
- `GET /api/sub-brokers` - List all sub-brokers
- `POST /api/sub-brokers` - Create sub-broker
- `GET /api/sub-brokers/:id` - Get sub-broker details
- `PUT /api/sub-brokers/:id` - Update sub-broker
- `DELETE /api/sub-brokers/:id` - Deactivate sub-broker

### Companies (Admin for CUD operations)
- `GET /api/companies` - List companies
- `POST /api/companies` - Create company (Admin)
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company (Admin)
- `DELETE /api/companies/:id` - Deactivate company (Admin)

### Commission Rules (Admin Only)
- `GET /api/commission-rules` - List commission rules
- `POST /api/commission-rules` - Create commission rule
- `PUT /api/commission-rules/:id` - Update commission rule
- `DELETE /api/commission-rules/:id` - Delete commission rule

## Database Schema

See `prisma/schema.prisma` for complete schema.

Key entities:
- **InsuranceCompany** - Insurance providers
- **SubBroker** - Sub-brokers/users (with ADMIN and SUB_BROKER roles)
- **Policy** - Insurance policies
- **Commission** - Auto-generated commissions
- **Renewal** - Auto-generated renewal reminders
- **CommissionRule** - Tiered commission configuration

## Auto-Generated Features

### Commission Calculation
When a policy is created:
1. Fetch applicable commission rule
2. Calculate commission based on premium and tier
3. Auto-create commission record

### Renewal Reminders
When a policy is created:
1. Auto-create renewal record with `renewalDate = policy.endDate`
2. Daily cron job checks and sends emails at 30, 15, 7, and 1 day before expiry

## Cron Jobs

Configured in `src/jobs/index.ts`:
- **Renewal Reminders**: Runs daily at 9 AM

## Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start                # Start production server
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Seed database
```

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── controllers/        # Request handlers
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, error handling
│   ├── services/          # Business logic
│   ├── jobs/              # Cron jobs
│   ├── utils/             # Helpers (Prisma client)
│   └── index.ts           # Entry point
├── .env                   # Environment variables
└── package.json
```

## Authentication

All protected routes require a Bearer token:

```
Authorization: Bearer <JWT_TOKEN>
```

Token payload includes:
- `userId`
- `email`
- `role` (ADMIN or SUB_BROKER)
- `brokerCode`

## Role-Based Access

- **ADMIN**: Full access to all endpoints
- **SUB_BROKER**: Can only view/manage own policies, commissions, and renewals

## Error Handling

All errors return:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2024-01-06T10:30:00Z"
}
```

## Development

### Add New Entity
1. Update `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_entity`
3. Create controller in `src/controllers/`
4. Create routes in `src/routes/`
5. Register routes in `src/index.ts`

### Testing
(To be implemented)
- Unit tests with Jest
- Integration tests for APIs
- E2E tests

## Production Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Run migrations: `npx prisma migrate deploy`
4. Start server: `npm start`

Recommended platforms:
- Railway
- Render
- AWS EC2
- DigitalOcean

## License

ISC
