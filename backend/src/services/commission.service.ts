import prisma from '../utils/prisma';
import { Decimal } from '@prisma/client/runtime/library';

interface CommissionCalculation {
  totalCommissionAmount: number;
  agentCommissionAmount: number;
  subAgentCommissionAmount: number;
}

/**
 * Calculate commission amounts for a policy
 * @param premiumAmount - The premium amount of the policy
 * @param commissionRate - The commission rate percentage
 * @param subAgentId - Optional sub-agent ID for commission split
 * @returns Commission breakdown
 */
export const calculateCommission = async (
  premiumAmount: number,
  commissionRate: number,
  subAgentId?: string
): Promise<CommissionCalculation> => {
  const totalCommissionAmount = (premiumAmount * commissionRate) / 100;
  
  let agentCommissionAmount = totalCommissionAmount;
  let subAgentCommissionAmount = 0;

  // If sub-agent is involved, split commission
  if (subAgentId) {
    const subAgent = await prisma.subAgent.findUnique({
      where: { id: subAgentId },
    });

    if (subAgent && subAgent.commissionPercentage) {
      const subAgentPercentage = Number(subAgent.commissionPercentage);
      subAgentCommissionAmount = (totalCommissionAmount * subAgentPercentage) / 100;
      agentCommissionAmount = totalCommissionAmount - subAgentCommissionAmount;
    }
  }

  return {
    totalCommissionAmount,
    agentCommissionAmount,
    subAgentCommissionAmount,
  };
};

/**
 * Create commission record for a policy
 * @param policyId - The policy ID
 * @param agentId - The agent ID
 * @param companyId - The insurance company ID
 * @param premiumAmount - The premium amount
 * @param commissionRate - The commission rate percentage
 * @param subAgentId - Optional sub-agent ID
 * @param commissionType - Type of commission (new_business, renewal)
 * @returns Created commission record
 */
export const createCommissionForPolicy = async (
  policyId: string,
  agentId: string,
  companyId: string,
  premiumAmount: number,
  commissionRate: number,
  subAgentId?: string,
  commissionType: string = 'new_business'
) => {
  const { totalCommissionAmount, agentCommissionAmount, subAgentCommissionAmount } = 
    await calculateCommission(premiumAmount, commissionRate, subAgentId);

  const commission = await prisma.commission.create({
    data: {
      policyId,
      agentId,
      companyId,
      subAgentId,
      totalCommissionPercent: new Decimal(commissionRate),
      totalCommissionAmount: new Decimal(totalCommissionAmount),
      agentCommissionAmount: new Decimal(agentCommissionAmount),
      subAgentCommissionAmount: subAgentId ? new Decimal(subAgentCommissionAmount) : undefined,
      receivedFromCompany: false,
      paidToSubAgent: subAgentId ? false : false,
      commissionType,
    },
    include: {
      policy: true,
      agent: true,
      subAgent: true,
      company: true,
    },
  });

  return commission;
};

/**
 * Mark commission as received from company
 * @param commissionId - The commission ID
 * @param receivedDate - The date received
 */
export const markCommissionReceived = async (
  commissionId: string,
  receivedDate: Date = new Date()
) => {
  const commission = await prisma.commission.update({
    where: { id: commissionId },
    data: {
      receivedFromCompany: true,
      receivedDate,
    },
  });

  return commission;
};

/**
 * Mark sub-agent commission as paid
 * @param commissionId - The commission ID
 * @param paidDate - The date paid
 */
export const markSubAgentPaid = async (
  commissionId: string,
  paidDate: Date = new Date()
) => {
  const commission = await prisma.commission.update({
    where: { id: commissionId },
    data: {
      paidToSubAgent: true,
      paidToSubAgentDate: paidDate,
    },
  });

  return commission;
};

/**
 * Get commission summary for an agent
 * @param agentId - The agent ID
 * @param startDate - Optional start date
 * @param endDate - Optional end date
 */
export const getCommissionSummary = async (
  agentId: string,
  startDate?: Date,
  endDate?: Date
) => {
  const where: any = { agentId };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const commissions = await prisma.commission.aggregate({
    where,
    _sum: {
      totalCommissionAmount: true,
      agentCommissionAmount: true,
      subAgentCommissionAmount: true,
    },
    _count: true,
  });

  const pendingFromCompany = await prisma.commission.aggregate({
    where: {
      ...where,
      receivedFromCompany: false,
    },
    _sum: {
      totalCommissionAmount: true,
    },
    _count: true,
  });

  const receivedFromCompany = await prisma.commission.aggregate({
    where: {
      ...where,
      receivedFromCompany: true,
    },
    _sum: {
      totalCommissionAmount: true,
    },
    _count: true,
  });

  return {
    total: {
      amount: Number(commissions._sum.totalCommissionAmount || 0),
      count: commissions._count,
    },
    agentShare: Number(commissions._sum.agentCommissionAmount || 0),
    subAgentShare: Number(commissions._sum.subAgentCommissionAmount || 0),
    pending: {
      amount: Number(pendingFromCompany._sum.totalCommissionAmount || 0),
      count: pendingFromCompany._count,
    },
    received: {
      amount: Number(receivedFromCompany._sum.totalCommissionAmount || 0),
      count: receivedFromCompany._count,
    },
  };
};

/**
 * Get sub-agent commission summary
 * @param subAgentId - The sub-agent ID
 */
export const getSubAgentCommissionSummary = async (subAgentId: string) => {
  const commissions = await prisma.commission.aggregate({
    where: { subAgentId },
    _sum: {
      subAgentCommissionAmount: true,
    },
    _count: true,
  });

  const pending = await prisma.commission.aggregate({
    where: {
      subAgentId,
      paidToSubAgent: false,
    },
    _sum: {
      subAgentCommissionAmount: true,
    },
    _count: true,
  });

  const paid = await prisma.commission.aggregate({
    where: {
      subAgentId,
      paidToSubAgent: true,
    },
    _sum: {
      subAgentCommissionAmount: true,
    },
    _count: true,
  });

  return {
    total: {
      amount: Number(commissions._sum.subAgentCommissionAmount || 0),
      count: commissions._count,
    },
    pending: {
      amount: Number(pending._sum.subAgentCommissionAmount || 0),
      count: pending._count,
    },
    paid: {
      amount: Number(paid._sum.subAgentCommissionAmount || 0),
      count: paid._count,
    },
  };
};
