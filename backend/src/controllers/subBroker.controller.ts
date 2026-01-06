import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

export const getAllSubBrokers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const brokers = await prisma.subBroker.findMany({
      where: { role: 'SUB_BROKER' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        brokerCode: true,
        isActive: true,
        joiningDate: true,
        _count: {
          select: { policies: true, commissions: true },
        },
      },
    });

    res.json({ success: true, data: brokers });
  } catch (error) {
    next(error);
  }
};

export const createSubBroker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, brokerCode, password, bankDetails } = req.body;

    const passwordHash = await bcrypt.hash(password || 'default123', 10);

    const broker = await prisma.subBroker.create({
      data: {
        name,
        email,
        phone,
        brokerCode,
        passwordHash,
        bankDetails,
        role: 'SUB_BROKER',
      },
    });

    res.status(201).json({ success: true, data: broker, message: 'Sub-broker created' });
  } catch (error) {
    next(error);
  }
};

export const getSubBrokerById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const broker = await prisma.subBroker.findUnique({
      where: { id },
      include: {
        _count: { select: { policies: true, commissions: true } },
      },
    });

    if (!broker) {
      throw new AppError('Sub-broker not found', 404, 'NOT_FOUND');
    }

    res.json({ success: true, data: broker });
  } catch (error) {
    next(error);
  }
};

export const updateSubBroker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updated = await prisma.subBroker.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, data: updated, message: 'Sub-broker updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteSubBroker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.subBroker.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Sub-broker deactivated' });
  } catch (error) {
    next(error);
  }
};
