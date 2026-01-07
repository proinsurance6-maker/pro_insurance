import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

interface CommissionTier {
  minPremium: number;
  maxPremium: number | null;
  rate: number;
}

export const getApplicableCommissionRule = async (
  companyId: string,
  policyType: string,
  premiumAmount: number
): Promise<{ rate: number; ruleId: string }> => {
  const today = new Date();

  // Find active commission rule
  const rule = await prisma.commissionRule.findFirst({
    where: {
      companyId,
      policyType,
      effectiveFrom: { lte: today },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: today } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  if (!rule) {
    throw new AppError(
      `No commission rule found for company and policy type`,
      404,
      'RULE_NOT_FOUND'
    );
  }

  // Parse tier rules
  const tiers = rule.tierRules as unknown as CommissionTier[];

  // Find applicable tier
  const applicableTier = tiers.find(
    (tier) =>
      premiumAmount >= tier.minPremium &&
      (tier.maxPremium === null || premiumAmount <= tier.maxPremium)
  );

  if (!applicableTier) {
    throw new AppError(
      `No commission tier found for premium amount ${premiumAmount}`,
      404,
      'TIER_NOT_FOUND'
    );
  }

  return {
    rate: applicableTier.rate,
    ruleId: rule.id,
  };
};
