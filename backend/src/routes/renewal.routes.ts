import { Router } from 'express';
import {
  getUpcomingRenewals,
  getExpiredPolicies,
  markRenewed,
  sendRenewalReminder,
  getRenewalCalendar,
  getTodaysRenewals
} from '../controllers/renewal.controller';
import { authenticate, requireAgent } from '../middleware/auth';

const router = Router();

// All routes require agent authentication
router.use(authenticate, requireAgent);

// Renewal views
router.get('/upcoming', getUpcomingRenewals);
router.get('/expired', getExpiredPolicies);
router.get('/today', getTodaysRenewals);
router.get('/calendar', getRenewalCalendar);

// Actions
router.put('/:id/mark-renewed', markRenewed);
router.post('/:id/send-reminder', sendRenewalReminder);

export default router;
