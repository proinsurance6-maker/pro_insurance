import { Router } from 'express';
import {
  getCommissions,
  getCommissionByCompany,
  markCommissionPaid,
  bulkMarkPaid,
  getSubAgentCommissions,
  getSingleSubAgentCommissions,
  markPaidToSubAgent,
  bulkMarkPaidToSubAgent
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

// Mark as paid (from company)
router.put('/:id/paid', markCommissionPaid);
router.post('/bulk-paid', bulkMarkPaid);

// Mark as paid to sub-agent
router.put('/:id/paid-to-subagent', markPaidToSubAgent);
router.post('/bulk-paid-to-subagent', bulkMarkPaidToSubAgent);

export default router;
