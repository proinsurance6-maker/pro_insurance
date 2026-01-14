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
import brokerRoutes from './routes/broker.routes';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './jobs';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - Allow multiple origins for Vercel deployments
const allowedOrigins = [
  'http://localhost:3000',
  'https://insurancebook.vercel.app',
  'https://insurance-book.vercel.app',
  process.env.CORS_ORIGIN,
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if origin matches any allowed origin or Vercel preview URLs
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.includes('vercel.app') || 
                      origin.includes('localhost');
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
app.use('/api/brokers', brokerRoutes);

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
