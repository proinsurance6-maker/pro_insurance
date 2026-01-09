import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { sendOTPviaSMS, sendWelcomeSMS } from '../services/sms.service';

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate unique agent code
const generateAgentCode = async (): Promise<string> => {
  const count = await prisma.agent.count();
  return `AGT${String(count + 1).padStart(4, '0')}`;
};

// ==========================================
// SEND OTP
// ==========================================
export const sendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, purpose = 'login' } = req.body;

    if (!phone || phone.length !== 10) {
      throw new AppError('Valid 10-digit phone number is required', 400, 'VALIDATION_ERROR');
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Check if agent exists
    const agent = await prisma.agent.findUnique({ where: { phone } });

    // Save OTP to database
    await prisma.otpCode.create({
      data: {
        phone,
        code,
        agentId: agent?.id,
        purpose,
        expiresAt
      }
    });

    // Send OTP via SMS (Twilio)
    await sendOTPviaSMS(phone, code);

    res.json({
      success: true,
      data: {
        phone,
        expiresIn: 300, // 5 minutes in seconds
        isNewUser: !agent
      },
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// VERIFY OTP & LOGIN/SIGNUP
// ==========================================
export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code, name, teamMode } = req.body;

    if (!phone || !code) {
      throw new AppError('Phone and OTP are required', 400, 'VALIDATION_ERROR');
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP');
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() }
    });

    // Check if agent exists
    let agent = await prisma.agent.findUnique({
      where: { phone },
      include: { subscription: true }
    });

    let isNewUser = false;

    // If new user, create agent with trial subscription
    if (!agent) {
      if (!name) {
        throw new AppError('Name is required for new registration', 400, 'VALIDATION_ERROR');
      }

      isNewUser = true;
      const agentCode = await generateAgentCode();
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 60); // 60 days trial

      agent = await prisma.agent.create({
        data: {
          agentCode,
          name,
          phone,
          teamMode: teamMode || 'SOLO',
          isActive: true,
          subscription: {
            create: {
              status: 'TRIAL',
              trialStartDate,
              trialEndDate,
              monthlyAmount: 100
            }
          }
        },
        include: { subscription: true }
      });

      // Send welcome SMS to new agent
      sendWelcomeSMS(phone, name, agentCode).catch(console.error);
    }

    // Check subscription status
    const subscription = agent.subscription;
    let subscriptionStatus = 'EXPIRED';
    
    if (subscription) {
      if (subscription.status === 'TRIAL') {
        if (new Date() < subscription.trialEndDate) {
          subscriptionStatus = 'TRIAL';
        }
      } else if (subscription.status === 'ACTIVE') {
        if (subscription.currentPeriodEnd && new Date() < subscription.currentPeriodEnd) {
          subscriptionStatus = 'ACTIVE';
        }
      }
    }

    // Generate JWT token
    const tokenPayload = {
      userId: agent.id,
      phone: agent.phone,
      role: 'AGENT',
      agentCode: agent.agentCode
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET!, { expiresIn: '7d' });
    const refreshToken = jwt.sign({ userId: agent.id }, process.env.JWT_SECRET!, { expiresIn: '30d' });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        isNewUser,
        user: {
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          agentCode: agent.agentCode,
          teamMode: agent.teamMode,
          role: 'AGENT',
          subscription: {
            status: subscriptionStatus,
            trialEndDate: subscription?.trialEndDate,
            currentPeriodEnd: subscription?.currentPeriodEnd
          }
        }
      },
      message: isNewUser ? 'Registration successful' : 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADMIN LOGIN (Email/Password)
// ==========================================
export const adminLogin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { email }
    });

    if (!admin || !admin.isActive) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = jwt.sign(
      { userId: admin.id, email: admin.email, role: 'ADMIN' },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'ADMIN'
        }
      },
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CLIENT SEND OTP
// ==========================================
export const clientSendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, agentCode } = req.body;

    if (!phone || phone.length !== 10) {
      throw new AppError('Valid 10-digit phone number is required', 400, 'VALIDATION_ERROR');
    }

    // Check if client exists
    const client = await prisma.client.findFirst({ 
      where: { phone },
      include: { agent: true }
    });

    // For new clients, agent code is required
    if (!client && !agentCode) {
      throw new AppError('Agent code is required for new clients', 400, 'AGENT_CODE_REQUIRED');
    }

    // If agent code provided, verify it
    if (agentCode) {
      const agent = await prisma.agent.findUnique({ where: { agentCode } });
      if (!agent) {
        throw new AppError('Invalid agent code', 400, 'INVALID_AGENT_CODE');
      }
    }

    // Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpCode.create({
      data: {
        phone,
        code,
        clientId: client?.id,
        purpose: 'login',
        expiresAt
      }
    });

    console.log(`📱 Client OTP for ${phone}: ${code}`);

    res.json({
      success: true,
      data: {
        phone,
        expiresIn: 300,
        isNewClient: !client,
        agentName: client?.agent.name
      },
      message: 'OTP sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CLIENT VERIFY OTP
// ==========================================
export const clientVerifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code, name, agentCode } = req.body;

    if (!phone || !code) {
      throw new AppError('Phone and OTP are required', 400, 'VALIDATION_ERROR');
    }

    // Find valid OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!otpRecord) {
      throw new AppError('Invalid or expired OTP', 401, 'INVALID_OTP');
    }

    // Mark OTP as used
    await prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() }
    });

    // Check if client exists
    let client = await prisma.client.findFirst({
      where: { phone },
      include: { agent: true, familyMembers: true }
    });

    let isNewClient = false;

    // If new client, create with agent link
    if (!client) {
      if (!name || !agentCode) {
        throw new AppError('Name and agent code are required for new clients', 400, 'VALIDATION_ERROR');
      }

      const agent = await prisma.agent.findUnique({ where: { agentCode } });
      if (!agent) {
        throw new AppError('Invalid agent code', 400, 'INVALID_AGENT_CODE');
      }

      isNewClient = true;
      const clientCount = await prisma.client.count({ where: { agentId: agent.id } });
      const clientCode = `${agentCode}-C${String(clientCount + 1).padStart(3, '0')}`;

      client = await prisma.client.create({
        data: {
          agentId: agent.id,
          clientCode,
          name,
          phone,
          isActive: true
        },
        include: { agent: true, familyMembers: true }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: client.id,
        phone: client.phone,
        role: 'CLIENT',
        agentId: client.agentId
      },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      data: {
        token,
        isNewClient,
        user: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email,
          clientCode: client.clientCode,
          role: 'CLIENT',
          agentName: client.agent.name,
          agentCode: client.agent.agentCode,
          pendingAmount: client.pendingAmount.toString(),
          familyMembers: client.familyMembers
        }
      },
      message: isNewClient ? 'Registration successful' : 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================
export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = (req as any).user;

    if (role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: userId } });
      if (!admin) throw new AppError('User not found', 404, 'NOT_FOUND');
      
      res.json({
        success: true,
        data: { id: admin.id, name: admin.name, email: admin.email, role: 'ADMIN' }
      });
    } else if (role === 'AGENT') {
      const agent = await prisma.agent.findUnique({
        where: { id: userId },
        include: { subscription: true }
      });
      if (!agent) throw new AppError('User not found', 404, 'NOT_FOUND');
      
      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          phone: agent.phone,
          email: agent.email,
          agentCode: agent.agentCode,
          teamMode: agent.teamMode,
          role: 'AGENT',
          subscription: agent.subscription
        }
      });
    } else if (role === 'CLIENT') {
      const client = await prisma.client.findUnique({
        where: { id: userId },
        include: { agent: true, familyMembers: true }
      });
      if (!client) throw new AppError('User not found', 404, 'NOT_FOUND');
      
      res.json({
        success: true,
        data: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          email: client.email,
          clientCode: client.clientCode,
          role: 'CLIENT',
          agentName: client.agent.name,
          pendingAmount: client.pendingAmount.toString(),
          familyMembers: client.familyMembers
        }
      });
    }
  } catch (error) {
    next(error);
  }
};
