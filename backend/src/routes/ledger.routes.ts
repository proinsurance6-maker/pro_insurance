import { Router } from 'express';
import {
  getLedgerEntries,
  createDebitEntry,
  createCollectionEntry,
  getClientKhata,
  getPendingCollections,
  updateLedgerEntry,
  deleteLedgerEntry
} from '../controllers/ledger.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Ledger entries
router.get('/', getLedgerEntries);
router.post('/debit', createDebitEntry);
router.post('/collection', createCollectionEntry);
router.put('/:id', updateLedgerEntry);
router.delete('/:id', deleteLedgerEntry);

// Client Khata (Statement)
router.get('/client/:clientId', getClientKhata);

// Pending collections summary
router.get('/pending', getPendingCollections);

export default router;
