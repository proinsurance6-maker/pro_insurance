# Production Optimization Guide

## Backend Optimizations

### 1. Database Query Optimization

#### Use Select to Limit Fields
```typescript
// Before
const policies = await prisma.policy.findMany();

// After
const policies = await prisma.policy.findMany({
  select: {
    id: true,
    policyNumber: true,
    customerName: true,
    premiumAmount: true,
    // Only fields you need
  }
});
```

#### Add Indexes
```prisma
// prisma/schema.prisma
model Policy {
  policyNumber String @unique @db.VarChar(100)
  createdAt    DateTime @default(now()) @db.Timestamp(0)
  
  @@index([companyId])
  @@index([subBrokerId])
  @@index([createdAt])
}
```

Then run:
```bash
npx prisma migrate dev --name add_indexes
```

### 2. API Response Caching

Create `backend/src/middleware/cache.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.originalUrl;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return res.json(cached.data);
  }
  
  const originalJson = res.json.bind(res);
  res.json = (data: any) => {
    cache.set(key, { data, timestamp: Date.now() });
    return originalJson(data);
  };
  
  next();
};

// Use on routes
router.get('/companies', cacheMiddleware, getCompanies);
```

### 3. Connection Pooling

Update `backend/prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["interactiveTransactions"]
  binaryTargets   = ["native", "linux-musl"]
}
```

Set connection pool in DATABASE_URL:
```
postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20
```

### 4. Compression Middleware

```bash
npm install compression
```

```typescript
// backend/src/index.ts
import compression from 'compression';

app.use(compression());
```

### 5. Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
// backend/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

// Use in index.ts
app.use('/api/', limiter);
```

---

## Frontend Optimizations

### 1. Next.js Configuration

Update `frontend/next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  // Optimize images
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
  },
  
  // Optimize builds
  swcMinify: true,
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  
  // Compression
  compress: true,
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2. Code Splitting & Lazy Loading

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const AnalyticsChart = dynamic(() => import('@/components/AnalyticsChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false
});
```

### 3. API Response Caching (React Query)

Update `frontend/lib/api.ts`:
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### 4. Optimize Bundle Size

```bash
# Analyze bundle
npm install @next/bundle-analyzer

# Update next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

---

## Database Optimizations

### 1. Add Missing Indexes

```sql
-- Add indexes for foreign keys
CREATE INDEX idx_policies_company_id ON policies(company_id);
CREATE INDEX idx_policies_sub_broker_id ON policies(sub_broker_id);
CREATE INDEX idx_commissions_policy_id ON commissions(policy_id);
CREATE INDEX idx_renewals_policy_id ON renewals(policy_id);

-- Add indexes for date columns
CREATE INDEX idx_policies_end_date ON policies(end_date);
CREATE INDEX idx_renewals_renewal_date ON renewals(renewal_date);
CREATE INDEX idx_policies_created_at ON policies(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_policies_broker_company ON policies(sub_broker_id, company_id);
CREATE INDEX idx_renewals_date_renewed ON renewals(renewal_date, is_renewed);
```

### 2. Regular Maintenance

```sql
-- Run weekly
VACUUM ANALYZE;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Optimize Queries

```typescript
// Use pagination
const policies = await prisma.policy.findMany({
  take: 20,
  skip: page * 20,
  orderBy: { createdAt: 'desc' }
});

// Use aggregations efficiently
const stats = await prisma.commission.aggregate({
  _sum: {
    commissionAmount: true
  },
  _count: true,
  where: {
    subBrokerId: userId
  }
});
```

---

## Performance Monitoring

### 1. Add Health Check Endpoint

```typescript
// backend/src/routes/health.ts
import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

export default router;
```

### 2. Setup Logging

```bash
npm install winston
```

```typescript
// backend/src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Use in routes
logger.info('Policy created', { policyId: policy.id });
logger.error('Failed to create policy', { error: error.message });
```

### 3. Performance Metrics

```typescript
// backend/src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

---

## Security Hardening

### 1. Helmet.js for Security Headers

```bash
npm install helmet
```

```typescript
// backend/src/index.ts
import helmet from 'helmet';

app.use(helmet());
```

### 2. Input Validation

```bash
npm install express-validator
```

```typescript
// backend/src/middleware/validation.ts
import { body, validationResult } from 'express-validator';

export const validatePolicy = [
  body('policyNumber').notEmpty().trim(),
  body('premiumAmount').isNumeric(),
  body('customerEmail').isEmail(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// Use in routes
router.post('/policies', validatePolicy, createPolicy);
```

### 3. Environment Variable Validation

```typescript
// backend/src/config/env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

export function validateEnv() {
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

---

## Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] All tests pass
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL/HTTPS enabled
- [ ] CORS configured for production domain
- [ ] Rate limiting enabled
- [ ] Compression enabled
- [ ] Logging configured
- [ ] Health check endpoint working
- [ ] Error tracking (Sentry) configured
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured

---

## Performance Targets

### Backend
- API response time: < 200ms (p95)
- Database queries: < 100ms average
- CPU usage: < 70%
- Memory usage: < 512MB

### Frontend
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

### Database
- Query performance: < 50ms average
- Connection pool: 10-20 connections
- Index usage: > 95% of queries

---

**Apply these optimizations for production-ready performance! 🚀**
