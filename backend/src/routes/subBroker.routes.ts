import { Router } from 'express';
import { authenticate, adminAuth } from '../middleware/auth';
import {
  getAllSubBrokers,
  createSubBroker,
  getSubBrokerById,
  updateSubBroker,
  deleteSubBroker,
} from '../controllers/subBroker.controller';

const router = Router();

router.use(authenticate);
router.use(adminAuth); // All routes admin only

router.get('/', getAllSubBrokers);
router.post('/', createSubBroker);
router.get('/:id', getSubBrokerById);
router.put('/:id', updateSubBroker);
router.delete('/:id', deleteSubBroker);

export default router;
