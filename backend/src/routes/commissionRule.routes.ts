import { Router } from 'express';
import { authenticate, adminAuth } from '../middleware/auth';
import {
  getCommissionRules,
  createCommissionRule,
  updateCommissionRule,
  deleteCommissionRule,
} from '../controllers/commissionRule.controller';

const router = Router();

router.use(authenticate);
router.use(adminAuth);

router.get('/', getCommissionRules);
router.post('/', createCommissionRule);
router.put('/:id', updateCommissionRule);
router.delete('/:id', deleteCommissionRule);

export default router;
