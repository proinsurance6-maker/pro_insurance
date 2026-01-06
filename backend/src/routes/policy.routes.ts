import { Router } from 'express';
import { authenticate, adminAuth } from '../middleware/auth';
import {
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  bulkUpload,
} from '../controllers/policy.controller';

const router = Router();

router.use(authenticate); // All routes require authentication

router.get('/', getPolicies);
router.post('/', createPolicy);
router.post('/bulk-upload', adminAuth, bulkUpload);
router.get('/:id', getPolicyById);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

export default router;
