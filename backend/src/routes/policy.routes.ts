import { Router } from 'express';
import {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getCompanies,
  renewPolicy
} from '../controllers/policy.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Get insurance companies (for dropdown)
router.get('/companies', getCompanies);

// Policy CRUD
router.get('/', getPolicies);
router.get('/:id', getPolicy);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

// Renew policy
router.post('/:id/renew', renewPolicy);

export default router;
