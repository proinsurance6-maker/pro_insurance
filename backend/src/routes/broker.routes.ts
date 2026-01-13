import { Router } from 'express';
import { authenticate, requireAgent } from '../middleware/auth';
import {
  getBrokers,
  getBrokerById,
  createBroker,
  updateBroker,
  deleteBroker,
} from '../controllers/broker.controller';

const router = Router();

// All routes require authentication and agent role
router.use(authenticate, requireAgent);

// GET /api/brokers - Get all brokers
router.get('/', getBrokers);

// GET /api/brokers/:id - Get single broker
router.get('/:id', getBrokerById);

// POST /api/brokers - Create new broker
router.post('/', createBroker);

// PUT /api/brokers/:id - Update broker
router.put('/:id', updateBroker);

// DELETE /api/brokers/:id - Delete (deactivate) broker
router.delete('/:id', deleteBroker);

export default router;
