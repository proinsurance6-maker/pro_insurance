import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getCommissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    
    if (req.user?.role !== 'ADMIN') {
      where.subBrokerId = req.user?.userId;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        policy: { select: { policyNumber: true, customerName: true } },
        company: { select: { name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: commissions });
  } catch (error) {
    next(error);
  }
};

export const getCommissionSummary = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = {};
    
    if (req.user?.role !== 'ADMIN') {
      where.subBrokerId = req.user?.userId;
    }

    const [totalCommission, paidCommission, pendingCommission] = await Promise.all([
      prisma.commission.aggregate({
        where,
        _sum: { commissionAmount: true },
      }),
      prisma.commission.aggregate({
        where: { ...where, paymentStatus: 'paid' },
        _sum: { commissionAmount: true },
      }),
      prisma.commission.aggregate({
        where: { ...where, paymentStatus: 'pending' },
        _sum: { commissionAmount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCommission._sum.commissionAmount || 0,
        paid: paidCommission._sum.commissionAmount || 0,
        pending: pendingCommission._sum.commissionAmount || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updatePaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentMethod, transactionReference } = req.body;

    const updated = await prisma.commission.update({
      where: { id },
      data: {
        paymentStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentMethod,
        transactionReference,
      },
    });

    res.json({ success: true, data: updated, message: 'Payment status updated' });
  } catch (error) {
    next(error);
  }
};
