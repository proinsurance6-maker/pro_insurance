import { Router } from 'express';
import {
  getDashboardStats,
  updateProfile,
  getSubAgents,
  createSubAgent,
  updateSubAgent,
  deleteSubAgent,
  getMonthlyReport
} from '../controllers/agent.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Profile
router.put('/profile', updateProfile);

// Reports
router.get('/reports/monthly', getMonthlyReport);

// Sub-agents
router.get('/sub-agents', getSubAgents);
router.post('/sub-agents', createSubAgent);
router.put('/sub-agents/:id', updateSubAgent);
router.delete('/sub-agents/:id', deleteSubAgent);

export default router;
