import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    brokerCode: string;
  };
  file?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'AUTH_ERROR');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
    }

    const decoded = jwt.verify(token, secret) as any;

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      brokerCode: decoded.brokerCode
    };

    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError') {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else if (error.name === 'TokenExpiredError') {
      next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
};

export const adminAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
    }

    if (req.user.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403, 'FORBIDDEN');
    }

    next();
  } catch (error) {
    next(error);
  }
};
