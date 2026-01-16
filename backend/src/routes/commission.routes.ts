import { Router } from 'express';
import {
  getCommissions,
  getCommissionByCompany,
  markCommissionPaid,
  bulkMarkPaid,
  getSubAgentCommissions,
  getSingleSubAgentCommissions
} from '../controllers/commission.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Commission reports
router.get('/', getCommissions);
router.get('/by-company', getCommissionByCompany);
router.get('/sub-agents', getSubAgentCommissions);
router.get('/sub-agent/:subAgentId', getSingleSubAgentCommissions);

// Mark as paid
router.put('/:id/paid', markCommissionPaid);
router.post('/bulk-paid', bulkMarkPaid);

export default router;
