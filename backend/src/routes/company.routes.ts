import { Router } from 'express';
import { authenticate, adminAuth } from '../middleware/auth';
import {
  getAllCompanies,
  createCompany,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from '../controllers/company.controller';

const router = Router();

router.use(authenticate);

router.get('/', getAllCompanies);
router.post('/', adminAuth, createCompany);
router.get('/:id', getCompanyById);
router.put('/:id', adminAuth, updateCompany);
router.delete('/:id', adminAuth, deleteCompany);

export default router;
