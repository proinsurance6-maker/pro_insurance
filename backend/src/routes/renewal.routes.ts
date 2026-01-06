import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getRenewals,
  getRenewalById,
  markAsRenewed,
} from '../controllers/renewal.controller';

const router = Router();

router.use(authenticate);

router.get('/', getRenewals);
router.get('/:id', getRenewalById);
router.put('/:id/complete', markAsRenewed);

export default router;
