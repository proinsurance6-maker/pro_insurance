import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import agentRoutes from './routes/agent.routes';
import clientRoutes from './routes/client.routes';
import policyRoutes from './routes/policy.routes';
import ledgerRoutes from './routes/ledger.routes';
import commissionRoutes from './routes/commission.routes';
import renewalRoutes from './routes/renewal.routes';
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
app.use('/api/agent', agentRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/renewals', renewalRoutes);

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
