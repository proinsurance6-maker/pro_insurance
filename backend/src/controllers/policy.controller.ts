import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// ==========================================
// GET ALL POLICIES
// ==========================================
export const getPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { search, clientId, companyId, policyType, status, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { agentId };

    if (clientId) where.clientId = clientId;
    if (companyId) where.companyId = companyId;
    if (policyType) where.policyType = policyType;

    if (status === 'active') {
      where.endDate = { gte: new Date() };
    } else if (status === 'expired') {
      where.endDate = { lt: new Date() };
    }

    if (search) {
      where.OR = [
        { policyNumber: { contains: search as string, mode: 'insensitive' } },
        { client: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, phone: true, clientCode: true } },
          company: { select: { id: true, name: true, code: true } },
          subAgent: { select: { id: true, name: true, subAgentCode: true } },
          commissions: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.policy.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        policies: policies.map(p => ({
          ...p,
          premiumAmount: p.premiumAmount.toString(),
          sumAssured: p.sumAssured?.toString(),
          commissions: p.commissions.map(c => ({
            ...c,
            totalCommissionPercent: c.totalCommissionPercent.toString(),
            totalCommissionAmount: c.totalCommissionAmount.toString(),
            agentCommissionAmount: c.agentCommissionAmount.toString(),
            subAgentCommissionAmount: c.subAgentCommissionAmount?.toString()
          }))
        })),
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
// GET SINGLE POLICY
// ==========================================
export const getPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const policy = await prisma.policy.findFirst({
      where: { id, agentId },
      include: {
        client: { include: { familyMembers: true } },
        company: true,
        subAgent: true,
        commissions: true,
        renewals: { orderBy: { renewalDate: 'desc' } },
        documents: true
      }
    });

    if (!policy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...policy,
        premiumAmount: policy.premiumAmount.toString(),
        sumAssured: policy.sumAssured?.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE POLICY
// ==========================================
export const createPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const {
      clientId, companyId, subAgentId, familyMemberId,
      policyNumber, policyType, planName, policySource,
      vehicleNumber, startDate, endDate,
      premiumAmount, sumAssured, premiumFrequency,
      premiumPaidBy, commissionPercent, remarks
    } = req.body;

    if (!clientId || !companyId || !policyNumber || !policyType || !startDate || !endDate || !premiumAmount) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const company = await prisma.insuranceCompany.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      throw new AppError('Insurance company not found', 404, 'COMPANY_NOT_FOUND');
    }

    const rate = commissionPercent || 15;
    const commissionAmount = (premiumAmount * rate) / 100;

    // Get sub-agent if specified
    let subAgentCommission = 0;
    let agentCommission = commissionAmount;
    
    if (subAgentId) {
      const subAgent = await prisma.subAgent.findFirst({
        where: { id: subAgentId, agentId }
      });
      if (subAgent) {
        subAgentCommission = (commissionAmount * Number(subAgent.commissionPercentage)) / 100;
        agentCommission = commissionAmount - subAgentCommission;
      }
    }

    const policy = await prisma.$transaction(async (tx) => {
      const newPolicy = await tx.policy.create({
        data: {
          agentId,
          clientId,
          companyId,
          subAgentId: subAgentId || null,
          familyMemberId: familyMemberId || null,
          policyNumber,
          policyType,
          planName,
          policySource: policySource || 'NEW',
          vehicleNumber,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          premiumAmount,
          sumAssured,
          premiumFrequency: premiumFrequency || 'yearly',
          premiumPaidBy: premiumPaidBy || 'CLIENT'
        }
      });

      await tx.commission.create({
        data: {
          policyId: newPolicy.id,
          agentId,
          subAgentId: subAgentId || null,
          companyId,
          totalCommissionPercent: rate,
          totalCommissionAmount: commissionAmount,
          agentCommissionAmount: agentCommission,
          subAgentCommissionAmount: subAgentCommission || null
        }
      });

      await tx.renewal.create({
        data: {
          policyId: newPolicy.id,
          renewalDate: new Date(endDate)
        }
      });

      if (premiumPaidBy === 'AGENT') {
        await tx.ledgerEntry.create({
          data: {
            agentId,
            clientId,
            policyId: newPolicy.id,
            entryType: 'DEBIT',
            amount: premiumAmount,
            description: `Policy premium paid by agent - ${policyNumber}`,
            entryDate: new Date()
          }
        });

        await tx.client.update({
          where: { id: clientId },
          data: { pendingAmount: { increment: premiumAmount } }
        });
      }

      return newPolicy;
    });

    const fullPolicy = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: { client: true, company: true, commissions: true }
    });

    res.status(201).json({
      success: true,
      data: fullPolicy,
      message: 'Policy created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE POLICY
// ==========================================
export const updatePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const {
      policyNumber, policyType, planName, vehicleNumber,
      startDate, endDate, premiumAmount, sumAssured, premiumFrequency, status
    } = req.body;

    const policy = await prisma.policy.findFirst({
      where: { id, agentId }
    });

    if (!policy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.policy.update({
      where: { id },
      data: {
        policyNumber,
        policyType,
        planName,
        vehicleNumber,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        premiumAmount,
        sumAssured,
        premiumFrequency,
        status
      },
      include: { client: true, company: true, commissions: true }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Policy updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE POLICY
// ==========================================
export const deletePolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const policy = await prisma.policy.findFirst({
      where: { id, agentId }
    });

    if (!policy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.commission.deleteMany({ where: { policyId: id } }),
      prisma.renewal.deleteMany({ where: { policyId: id } }),
      prisma.document.deleteMany({ where: { policyId: id } }),
      prisma.ledgerEntry.deleteMany({ where: { policyId: id } }),
      prisma.policy.delete({ where: { id } })
    ]);

    res.json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET INSURANCE COMPANIES
// ==========================================
export const getCompanies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const companies = await prisma.insuranceCompany.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: companies
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// RENEW POLICY
// ==========================================
export const renewPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { newPolicyNumber, newStartDate, newEndDate, newPremiumAmount, newSumAssured, premiumPaidBy, commissionPercent } = req.body;

    const oldPolicy = await prisma.policy.findFirst({
      where: { id, agentId },
      include: { client: true, company: true, subAgent: true }
    });

    if (!oldPolicy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    const rate = commissionPercent || 15;
    const commissionAmount = (newPremiumAmount * rate) / 100;

    let subAgentCommission = 0;
    let agentCommission = commissionAmount;
    
    if (oldPolicy.subAgent) {
      subAgentCommission = (commissionAmount * Number(oldPolicy.subAgent.commissionPercentage)) / 100;
      agentCommission = commissionAmount - subAgentCommission;
    }

    const newPolicy = await prisma.$transaction(async (tx) => {
      await tx.renewal.updateMany({
        where: { policyId: id, renewalStatus: 'pending' },
        data: { renewalStatus: 'renewed', renewedAt: new Date() }
      });

      const policy = await tx.policy.create({
        data: {
          agentId,
          clientId: oldPolicy.clientId,
          companyId: oldPolicy.companyId,
          subAgentId: oldPolicy.subAgentId,
          familyMemberId: oldPolicy.familyMemberId,
          policyNumber: newPolicyNumber,
          policyType: oldPolicy.policyType,
          planName: oldPolicy.planName,
          vehicleNumber: oldPolicy.vehicleNumber,
          startDate: new Date(newStartDate),
          endDate: new Date(newEndDate),
          premiumAmount: newPremiumAmount,
          sumAssured: newSumAssured || oldPolicy.sumAssured,
          premiumFrequency: oldPolicy.premiumFrequency,
          premiumPaidBy: premiumPaidBy || 'CLIENT',
          policySource: 'RENEWAL',
          previousPolicyId: id
        }
      });

      await tx.commission.create({
        data: {
          policyId: policy.id,
          agentId,
          subAgentId: oldPolicy.subAgentId,
          companyId: oldPolicy.companyId,
          totalCommissionPercent: rate,
          totalCommissionAmount: commissionAmount,
          agentCommissionAmount: agentCommission,
          subAgentCommissionAmount: subAgentCommission || null
        }
      });

      await tx.renewal.create({
        data: {
          policyId: policy.id,
          renewalDate: new Date(newEndDate)
        }
      });

      if (premiumPaidBy === 'AGENT') {
        await tx.ledgerEntry.create({
          data: {
            agentId,
            clientId: oldPolicy.clientId,
            policyId: policy.id,
            entryType: 'DEBIT',
            amount: newPremiumAmount,
            description: `Renewal premium paid by agent - ${newPolicyNumber}`,
            entryDate: new Date()
          }
        });

        await tx.client.update({
          where: { id: oldPolicy.clientId },
          data: { pendingAmount: { increment: newPremiumAmount } }
        });
      }

      return policy;
    });

    res.status(201).json({
      success: true,
      data: newPolicy,
      message: 'Policy renewed successfully'
    });
  } catch (error) {
    next(error);
  }
};
