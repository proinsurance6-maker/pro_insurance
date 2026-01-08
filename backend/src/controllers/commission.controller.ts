import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// ==========================================
// GET COMMISSIONS
// ==========================================
export const getCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { paymentStatus, companyId, startDate, endDate, page = '1', limit = '50' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { agentId };

    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (companyId) where.companyId = companyId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const [commissions, total, totalSum, paidSum, unpaidSum] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          policy: {
            include: {
              client: { select: { id: true, name: true, clientCode: true } },
              company: { select: { id: true, name: true, code: true } }
            }
          },
          subAgent: { select: { id: true, name: true, subAgentCode: true, commissionPercentage: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.commission.count({ where }),
      prisma.commission.aggregate({
        where,
        _sum: { totalCommissionAmount: true }
      }),
      prisma.commission.aggregate({
        where: { ...where, receivedFromCompany: true },
        _sum: { totalCommissionAmount: true }
      }),
      prisma.commission.aggregate({
        where: { ...where, receivedFromCompany: false },
        _sum: { totalCommissionAmount: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        commissions: commissions.map(c => ({
          id: c.id,
          policyId: c.policyId,
          policyNumber: c.policy.policyNumber,
          policyType: c.policy.policyType,
          clientName: c.policy.client.name,
          companyName: c.policy.company.name,
          premiumAmount: c.policy.premiumAmount.toString(),
          totalCommissionPercent: c.totalCommissionPercent.toString(),
          totalCommissionAmount: c.totalCommissionAmount.toString(),
          agentCommissionAmount: c.agentCommissionAmount.toString(),
          subAgentCommissionAmount: c.subAgentCommissionAmount?.toString(),
          paymentStatus: c.paymentStatus,
          receivedFromCompany: c.receivedFromCompany,
          receivedDate: c.receivedDate,
          subAgent: c.subAgent ? {
            name: c.subAgent.name,
            commissionPercentage: c.subAgent.commissionPercentage.toString()
          } : null,
          createdAt: c.createdAt
        })),
        summary: {
          total: totalSum._sum.totalCommissionAmount?.toString() || '0',
          received: paidSum._sum.totalCommissionAmount?.toString() || '0',
          pending: unpaidSum._sum.totalCommissionAmount?.toString() || '0'
        },
        pagination: {
          page: parseInt(page as string),
          limit: take,
          total,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET COMMISSION BY COMPANY
// ==========================================
export const getCommissionByCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { startDate, endDate } = req.query;

    const where: any = { agentId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const companies = await prisma.insuranceCompany.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true }
    });

    const summaryPromises = companies.map(async (company) => {
      const result = await prisma.commission.aggregate({
        where: { ...where, companyId: company.id },
        _sum: { totalCommissionAmount: true },
        _count: true
      });

      const paidResult = await prisma.commission.aggregate({
        where: { ...where, companyId: company.id, receivedFromCompany: true },
        _sum: { totalCommissionAmount: true }
      });

      return {
        companyId: company.id,
        companyName: company.name,
        code: company.code,
        policyCount: result._count,
        totalCommission: result._sum.totalCommissionAmount?.toString() || '0',
        receivedCommission: paidResult._sum.totalCommissionAmount?.toString() || '0',
        pendingCommission: (Number(result._sum.totalCommissionAmount || 0) - Number(paidResult._sum.totalCommissionAmount || 0)).toString()
      };
    });

    const summary = await Promise.all(summaryPromises);
    const filteredSummary = summary.filter(s => s.policyCount > 0);

    res.json({
      success: true,
      data: {
        companies: filteredSummary.sort((a, b) => Number(b.totalCommission) - Number(a.totalCommission)),
        totals: {
          totalPolicies: filteredSummary.reduce((sum, s) => sum + s.policyCount, 0),
          totalCommission: filteredSummary.reduce((sum, s) => sum + Number(s.totalCommission), 0).toString(),
          receivedCommission: filteredSummary.reduce((sum, s) => sum + Number(s.receivedCommission), 0).toString(),
          pendingCommission: filteredSummary.reduce((sum, s) => sum + Number(s.pendingCommission), 0).toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MARK COMMISSION AS RECEIVED
// ==========================================
export const markCommissionPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const commission = await prisma.commission.findFirst({
      where: { id, agentId }
    });

    if (!commission) {
      throw new AppError('Commission not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.commission.update({
      where: { id },
      data: { 
        receivedFromCompany: true,
        receivedDate: new Date(),
        paymentStatus: 'received'
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Commission marked as received'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BULK MARK COMMISSIONS AS RECEIVED
// ==========================================
export const bulkMarkPaid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { commissionIds } = req.body;

    if (!commissionIds || !Array.isArray(commissionIds)) {
      throw new AppError('Commission IDs array is required', 400, 'VALIDATION_ERROR');
    }

    const commissions = await prisma.commission.findMany({
      where: { id: { in: commissionIds }, agentId }
    });

    if (commissions.length !== commissionIds.length) {
      throw new AppError('Some commissions not found or not owned by you', 400, 'INVALID_IDS');
    }

    await prisma.commission.updateMany({
      where: { id: { in: commissionIds } },
      data: { 
        receivedFromCompany: true,
        receivedDate: new Date(),
        paymentStatus: 'received'
      }
    });

    res.json({
      success: true,
      message: `${commissionIds.length} commissions marked as received`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SUB-AGENT COMMISSION SUMMARY
// ==========================================
export const getSubAgentCommissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { startDate, endDate } = req.query;

    const subAgents = await prisma.subAgent.findMany({
      where: { agentId, isActive: true }
    });

    const where: any = { agentId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const summaryPromises = subAgents.map(async (subAgent) => {
      const result = await prisma.commission.aggregate({
        where: { ...where, subAgentId: subAgent.id },
        _sum: { 
          totalCommissionAmount: true,
          agentCommissionAmount: true,
          subAgentCommissionAmount: true
        },
        _count: true
      });

      return {
        subAgentId: subAgent.id,
        subAgentCode: subAgent.subAgentCode,
        name: subAgent.name,
        phone: subAgent.phone,
        commissionPercentage: subAgent.commissionPercentage.toString(),
        policyCount: result._count,
        totalCommission: result._sum.totalCommissionAmount?.toString() || '0',
        subAgentShare: result._sum.subAgentCommissionAmount?.toString() || '0',
        agentShare: result._sum.agentCommissionAmount?.toString() || '0'
      };
    });

    const summary = await Promise.all(summaryPromises);

    res.json({
      success: true,
      data: {
        subAgents: summary.filter(s => s.policyCount > 0),
        totals: {
          totalPolicies: summary.reduce((sum, s) => sum + s.policyCount, 0),
          totalCommission: summary.reduce((sum, s) => sum + Number(s.totalCommission), 0).toString(),
          totalSubAgentShare: summary.reduce((sum, s) => sum + Number(s.subAgentShare), 0).toString(),
          totalAgentShare: summary.reduce((sum, s) => sum + Number(s.agentShare), 0).toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
