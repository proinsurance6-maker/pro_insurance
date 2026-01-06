import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getCommissionRules = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rules = await prisma.commissionRule.findMany({
      include: {
        company: { select: { name: true, code: true } },
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

export const createCommissionRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { companyId, policyType, tierRules, effectiveFrom, effectiveTo } = req.body;

    const rule = await prisma.commissionRule.create({
      data: {
        companyId,
        policyType,
        tierRules,
        effectiveFrom: new Date(effectiveFrom),
        effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
        createdBy: req.user?.userId,
      },
    });

    res.status(201).json({ success: true, data: rule, message: 'Commission rule created' });
  } catch (error) {
    next(error);
  }
};

export const updateCommissionRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const updated = await prisma.commissionRule.update({
      where: { id },
      data: req.body,
    });

    res.json({ success: true, data: updated, message: 'Commission rule updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteCommissionRule = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.commissionRule.delete({ where: { id } });

    res.json({ success: true, message: 'Commission rule deleted' });
  } catch (error) {
    next(error);
  }
};
