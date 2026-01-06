import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCommissions,
  getCommissionSummary,
  updatePaymentStatus,
} from '../controllers/commission.controller';

const router = Router();

router.use(authenticate);

router.get('/', getCommissions);
router.get('/summary', getCommissionSummary);
router.put('/:id/payment', updatePaymentStatus);

export default router;
