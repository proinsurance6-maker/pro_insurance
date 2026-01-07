import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import policyRoutes from './routes/policy.routes';
import commissionRoutes from './routes/commission.routes';
import renewalRoutes from './routes/renewal.routes';
import subBrokerRoutes from './routes/subBroker.routes';
import companyRoutes from './routes/company.routes';
import commissionRuleRoutes from './routes/commissionRule.routes';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './jobs';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/renewals', renewalRoutes);
app.use('/api/sub-brokers', subBrokerRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/commission-rules', commissionRuleRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start cron jobs
startCronJobs();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.CORS_ORIGIN || process.env.FRONTEND_URL}`);
});

export default app;
