import { Router } from 'express';
import multer from 'multer';
import {
  getDashboardStats,
  updateProfile,
  getSubAgents,
  createSubAgent,
  updateSubAgent,
  deleteSubAgent,
  uploadSubAgentKyc,
  getMonthlyReport
} from '../controllers/agent.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
router.post('/sub-agents/:id/kyc', upload.array('documents'), uploadSubAgentKyc);

export default router;
