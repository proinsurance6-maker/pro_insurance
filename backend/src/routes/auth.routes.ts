import { Router } from 'express';
import {
  sendOTP,
  verifyOTP,
  adminLogin,
  clientSendOTP,
  clientVerifyOTP,
  getMe
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// ==========================================
// AGENT AUTH ROUTES
// ==========================================

// Send OTP to agent
router.post('/agent/send-otp', sendOTP);

// Verify OTP and login/signup agent
router.post('/agent/verify-otp', verifyOTP);

// ==========================================
// CLIENT AUTH ROUTES
// ==========================================

// Send OTP to client
router.post('/client/send-otp', clientSendOTP);

// Verify OTP and login/signup client
router.post('/client/verify-otp', clientVerifyOTP);

// ==========================================
// ADMIN AUTH ROUTES
// ==========================================

// Admin login with email/password
router.post('/admin/login', adminLogin);

// ==========================================
// COMMON ROUTES
// ==========================================

// Get current user info
router.get('/me', authenticate, getMe);

export default router;
