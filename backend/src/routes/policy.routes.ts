import { Router } from 'express';
import multer from 'multer';
import {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getCompanies,
  renewPolicy,
  scanDocument,
  parseExcel,
  bulkCreatePolicies
} from '../controllers/policy.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel', 'text/csv'
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Get insurance companies (for dropdown)
router.get('/companies', getCompanies);

// Document scanning / OCR
router.post('/scan-document', upload.single('document'), scanDocument);

// Excel parsing
router.post('/parse-excel', upload.single('file'), parseExcel);

// Bulk create policies
router.post('/bulk', bulkCreatePolicies);

// Policy CRUD
router.get('/', getPolicies);
router.get('/:id', getPolicy);
router.post('/', createPolicy);
router.put('/:id', updatePolicy);
router.delete('/:id', deletePolicy);

// Renew policy
router.post('/:id/renew', renewPolicy);

export default router;
