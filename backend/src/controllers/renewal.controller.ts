import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getRenewals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { renewalStatus: 'pending' };
    
    if (req.user?.role !== 'ADMIN') {
      where.policy = { subBrokerId: req.user?.userId };
    }

    const renewals = await prisma.renewal.findMany({
      where,
      include: {
        policy: {
          include: {
            company: { select: { name: true } },
            subBroker: { select: { name: true, brokerCode: true } },
          },
        },
      },
      orderBy: { renewalDate: 'asc' },
    });

    res.json({ success: true, data: renewals });
  } catch (error) {
    next(error);
  }
};

export const getRenewalById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const renewal = await prisma.renewal.findUnique({
      where: { id },
      include: { policy: true },
    });

    res.json({ success: true, data: renewal });
  } catch (error) {
    next(error);
  }
};

export const markAsRenewed = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { renewedPolicyId } = req.body;

    const updated = await prisma.renewal.update({
      where: { id },
      data: {
        renewalStatus: 'completed',
        renewedAt: new Date(),
        renewedPolicyId,
      },
    });

    res.json({ success: true, data: updated, message: 'Marked as renewed' });
  } catch (error) {
    next(error);
  }
};
