import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    // Find user
    const user = await prisma.subBroker.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        brokerCode: user.brokerCode,
      },
      process.env.JWT_SECRET!,
      { expiresIn: (process.env.JWT_EXPIRY || '15m') as string | number }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: (process.env.JWT_REFRESH_EXPIRY || '7d') as string | number }
    );

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          brokerCode: user.brokerCode,
        },
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, phone, brokerCode, role } = req.body;

    // Validation
    if (!name || !email || !password || !brokerCode) {
      throw new AppError('All required fields must be provided', 400, 'VALIDATION_ERROR');
    }

    // Check if user exists
    const existingUser = await prisma.subBroker.findFirst({
      where: {
        OR: [{ email }, { brokerCode }],
      },
    });

    if (existingUser) {
      throw new AppError('Email or broker code already exists', 409, 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.subBroker.create({
      data: {
        name,
        email,
        passwordHash,
        phone,
        brokerCode,
        role: role || 'SUB_BROKER',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        brokerCode: user.brokerCode,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401, 'AUTH_ERROR');
    }

    const user = await prisma.subBroker.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        brokerCode: true,
        joiningDate: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
