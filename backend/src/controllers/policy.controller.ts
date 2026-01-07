import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getApplicableCommissionRule } from '../services/commission.service';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

export const getPolicies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 20, status, companyId } = req.query;

    const where: any = {};

    // If not admin, filter by sub-broker
    if (req.user?.role !== 'ADMIN') {
      where.subBrokerId = req.user?.userId;
    }

    if (status) {
      where.status = status;
    }

    if (companyId) {
      where.companyId = companyId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        include: {
          company: {
            select: { id: true, name: true, code: true },
          },
          subBroker: {
            select: { id: true, name: true, brokerCode: true },
          },
          commissions: {
            select: {
              id: true,
              commissionAmount: true,
              paymentStatus: true,
            },
          },
          renewals: {
            select: {
              id: true,
              renewalDate: true,
              renewalStatus: true,
            },
          },
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.policy.count({ where }),
    ]);

    res.json({
      success: true,
      data: policies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getPolicyById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        company: true,
        subBroker: {
          select: {
            id: true,
            name: true,
            email: true,
            brokerCode: true,
          },
        },
        commissions: true,
        renewals: true,
      },
    });

    if (!policy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (req.user?.role !== 'ADMIN' && policy.subBrokerId !== req.user?.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    res.json({
      success: true,
      data: policy,
    });
  } catch (error) {
    next(error);
  }
};

export const createPolicy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      policyNumber,
      companyId,
      subBrokerId,
      customerName,
      customerEmail,
      customerPhone,
      policyType,
      premiumAmount,
      startDate,
      endDate,
      sumAssured,
    } = req.body;

    // Validation
    if (!policyNumber || !companyId || !subBrokerId || !customerName || !policyType || !premiumAmount || !startDate || !endDate) {
      throw new AppError('Required fields missing', 400, 'VALIDATION_ERROR');
    }

    // Check if policy number exists
    const existing = await prisma.policy.findUnique({
      where: { policyNumber },
    });

    if (existing) {
      throw new AppError('Policy number already exists', 409, 'DUPLICATE_POLICY');
    }

    // Get commission rule
    const commissionRule = await getApplicableCommissionRule(companyId, policyType, Number(premiumAmount));

    // Create policy, commission, and renewal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create policy
      const policy = await tx.policy.create({
        data: {
          policyNumber,
          companyId,
          subBrokerId,
          customerName,
          customerEmail,
          customerPhone,
          policyType,
          premiumAmount: Number(premiumAmount),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          sumAssured: sumAssured ? Number(sumAssured) : null,
          status: 'active',
        },
      });

      // Create commission
      const commissionAmount = (Number(premiumAmount) * commissionRule.rate) / 100;

      const commission = await tx.commission.create({
        data: {
          policyId: policy.id,
          subBrokerId,
          companyId,
          commissionPercentage: commissionRule.rate,
          baseAmount: Number(premiumAmount),
          commissionAmount,
          paymentStatus: 'pending',
          commissionType: 'new_business',
        },
      });

      // Create renewal
      const renewal = await tx.renewal.create({
        data: {
          policyId: policy.id,
          renewalDate: new Date(endDate),
          renewalStatus: 'pending',
        },
      });

      return { policy, commission, renewal };
    });

    res.status(201).json({
      success: true,
      data: result.policy,
      message: 'Policy created successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const updatePolicy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if policy exists
    const policy = await prisma.policy.findUnique({ where: { id } });

    if (!policy) {
      throw new AppError('Policy not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (req.user?.role !== 'ADMIN' && policy.subBrokerId !== req.user?.userId) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const updated = await prisma.policy.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: updated,
      message: 'Policy updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const deletePolicy = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Only admins can delete
    if (req.user?.role !== 'ADMIN') {
      throw new AppError('Admin access required', 403, 'FORBIDDEN');
    }

    await prisma.policy.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Policy deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpload = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // This is a placeholder - full implementation with file upload
    // would require multer middleware and CSV parsing

    const file = req.file;
    if (!file) {
      throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
    }

    // Parse CSV (simplified example)
    const fileContent = fs.readFileSync(file.path, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Validate and create policies
    const results = [];
    const errors = [];

    for (const row of records) {
      try {
        // Validate company and broker exist
        const company = await prisma.insuranceCompany.findUnique({
          where: { code: (row as any).company_code },
        });

        const broker = await prisma.subBroker.findUnique({
          where: { brokerCode: (row as any).sub_broker_code },
        });

        if (!company || !broker) {
          errors.push({ row, error: 'Company or broker not found' });
          continue;
        }

        // Create policy (same logic as createPolicy)
        // ...

        results.push(row);
      } catch (error: any) {
        errors.push({ row, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        uploaded: results.length,
        failed: errors.length,
        errors,
      },
      message: `Uploaded ${results.length} policies`,
    });
  } catch (error) {
    next(error);
  }
};
