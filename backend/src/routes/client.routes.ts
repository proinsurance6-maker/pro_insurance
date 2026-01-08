import { Router } from 'express';
import {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  addFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
  getClientLedger
} from '../controllers/client.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Client CRUD
router.get('/', getClients);
router.get('/:id', getClient);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

// Client Ledger
router.get('/:id/ledger', getClientLedger);

// Family members
router.post('/:clientId/family', addFamilyMember);
router.put('/:clientId/family/:memberId', updateFamilyMember);
router.delete('/:clientId/family/:memberId', deleteFamilyMember);

export default router;
