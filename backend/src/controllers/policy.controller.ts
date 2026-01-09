import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { extractPolicyFromImage } from '../services/ocr.service';

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

// ==========================================
// SCAN DOCUMENT (OCR) - OpenAI Vision API
// ==========================================
export const scanDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file;

    if (!file) {
      throw new AppError('No document uploaded', 400, 'VALIDATION_ERROR');
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new AppError(
        'OCR service not configured. Please add OPENAI_API_KEY to .env file.',
        500,
        'OCR_NOT_CONFIGURED'
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    
    if (!allowedImageTypes.includes(file.mimetype)) {
      if (file.mimetype === 'application/pdf') {
        throw new AppError(
          'PDF files are not supported yet. Please upload a photo/screenshot of the policy (JPG, PNG).',
          400,
          'PDF_NOT_SUPPORTED'
        );
      }
      throw new AppError('Invalid file type. Please upload an image (JPG, PNG, WebP).', 400, 'INVALID_FILE_TYPE');
    }

    // Convert buffer to base64
    const imageBase64 = file.buffer.toString('base64');

    // Extract data using OpenAI Vision
    const extractedData = await extractPolicyFromImage(imageBase64, file.mimetype);

    res.json({
      success: true,
      data: extractedData,
      message: 'Document scanned successfully! Please verify the extracted details.'
    });
  } catch (error: any) {
    // Handle specific OCR errors
    if (error.message?.includes('OPENAI_API_KEY')) {
      return next(new AppError('OCR service not configured. Contact admin.', 500, 'OCR_ERROR'));
    }
    if (error.message?.includes('rate limit')) {
      return next(new AppError('Too many requests. Please try again in a minute.', 429, 'RATE_LIMIT'));
    }
    next(error);
  }
};

// ==========================================
// PARSE EXCEL FILE
// ==========================================
export const parseExcel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const file = (req as any).file;

    if (!file) {
      throw new AppError('No file uploaded', 400, 'VALIDATION_ERROR');
    }

    let records: any[] = [];
    const buffer = file.buffer;

    // Handle CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      records = parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      });
    } else {
      // Handle Excel files with xlsx
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }

    // Get existing clients and companies for matching
    const [clients, companies] = await Promise.all([
      prisma.client.findMany({ where: { agentId }, select: { id: true, name: true, phone: true } }),
      prisma.insuranceCompany.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } })
    ]);

    // Map column names (flexible matching)
    const columnMap: Record<string, string> = {
      'policy number': 'policyNumber',
      'policy no': 'policyNumber',
      'policy_number': 'policyNumber',
      'policynumber': 'policyNumber',
      'client name': 'clientName',
      'client_name': 'clientName',
      'clientname': 'clientName',
      'customer name': 'clientName',
      'client phone': 'clientPhone',
      'client_phone': 'clientPhone',
      'phone': 'clientPhone',
      'mobile': 'clientPhone',
      'company': 'companyName',
      'company name': 'companyName',
      'company_name': 'companyName',
      'insurer': 'companyName',
      'policy type': 'policyType',
      'policy_type': 'policyType',
      'type': 'policyType',
      'premium': 'premiumAmount',
      'premium amount': 'premiumAmount',
      'premium_amount': 'premiumAmount',
      'sum assured': 'sumAssured',
      'sum_assured': 'sumAssured',
      'sumassured': 'sumAssured',
      'start date': 'startDate',
      'start_date': 'startDate',
      'startdate': 'startDate',
      'end date': 'endDate',
      'end_date': 'endDate',
      'enddate': 'endDate',
      'expiry date': 'endDate',
      'commission': 'commissionRate',
      'commission rate': 'commissionRate',
      'commission_rate': 'commissionRate'
    };

    // Normalize records
    const policies = records.map((row, index) => {
      const normalized: any = { rowIndex: index + 2 }; // +2 for Excel row (1-indexed + header)
      
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = columnMap[key.toLowerCase().trim()] || key;
        normalized[normalizedKey] = value;
      }

      // Match client by name or phone
      const matchedClient = clients.find(c => 
        c.name.toLowerCase() === normalized.clientName?.toLowerCase() ||
        c.phone === normalized.clientPhone?.replace(/\D/g, '').slice(-10)
      );

      // Match company by name or code
      const matchedCompany = companies.find(c =>
        c.name.toLowerCase().includes(normalized.companyName?.toLowerCase()) ||
        normalized.companyName?.toLowerCase().includes(c.name.toLowerCase()) ||
        c.code.toLowerCase() === normalized.companyName?.toLowerCase()
      );

      return {
        ...normalized,
        clientId: matchedClient?.id,
        companyId: matchedCompany?.id,
        premiumAmount: parseFloat(normalized.premiumAmount?.toString().replace(/[₹,]/g, '')) || 0,
        sumAssured: parseFloat(normalized.sumAssured?.toString().replace(/[₹,]/g, '')) || null,
        commissionRate: parseFloat(normalized.commissionRate) || 15,
        isValid: !!(matchedClient && matchedCompany && normalized.policyNumber && normalized.premiumAmount)
      };
    }).filter(p => p.policyNumber); // Filter out empty rows

    res.json({
      success: true,
      data: {
        policies,
        totalFound: policies.length,
        validCount: policies.filter(p => p.isValid).length
      },
      message: `Parsed ${policies.length} policies from file`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// BULK CREATE POLICIES
// ==========================================
export const bulkCreatePolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { policies } = req.body;

    if (!policies || !Array.isArray(policies) || policies.length === 0) {
      throw new AppError('No policies provided', 400, 'VALIDATION_ERROR');
    }

    // Validate and create policies in transaction
    const results = await prisma.$transaction(async (tx) => {
      const created: any[] = [];
      const errors: any[] = [];

      for (const policyData of policies) {
        try {
          // Validate client belongs to agent
          if (!policyData.clientId) {
            errors.push({ row: policyData.rowIndex, error: 'Client not found' });
            continue;
          }

          const client = await tx.client.findFirst({
            where: { id: policyData.clientId, agentId }
          });

          if (!client) {
            errors.push({ row: policyData.rowIndex, error: 'Client not found for this agent' });
            continue;
          }

          if (!policyData.companyId) {
            errors.push({ row: policyData.rowIndex, error: 'Insurance company not found' });
            continue;
          }

          // Check for duplicate policy number
          const existing = await tx.policy.findUnique({
            where: { policyNumber: policyData.policyNumber }
          });

          if (existing) {
            errors.push({ row: policyData.rowIndex, error: 'Policy number already exists' });
            continue;
          }

          // Parse dates
          const startDate = policyData.startDate ? new Date(policyData.startDate) : new Date();
          let endDate = policyData.endDate ? new Date(policyData.endDate) : new Date(startDate);
          if (!policyData.endDate) {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          // Create policy
          const policy = await tx.policy.create({
            data: {
              agentId,
              clientId: policyData.clientId,
              companyId: policyData.companyId,
              policyNumber: policyData.policyNumber,
              policyType: policyData.policyType || 'Other',
              premiumAmount: policyData.premiumAmount,
              sumAssured: policyData.sumAssured || null,
              startDate,
              endDate,
              policySource: 'NEW'
            }
          });

          // Create commission
          const rate = policyData.commissionRate || 15;
          const commissionAmount = (policyData.premiumAmount * rate) / 100;

          await tx.commission.create({
            data: {
              policyId: policy.id,
              agentId,
              companyId: policyData.companyId,
              totalCommissionPercent: rate,
              totalCommissionAmount: commissionAmount,
              agentCommissionAmount: commissionAmount
            }
          });

          // Create renewal
          await tx.renewal.create({
            data: {
              policyId: policy.id,
              renewalDate: endDate
            }
          });

          created.push(policy);
        } catch (err: any) {
          errors.push({ row: policyData.rowIndex, error: err.message });
        }
      }

      return { created, errors };
    });

    res.status(201).json({
      success: true,
      data: {
        created: results.created.length,
        errors: results.errors.length,
        errorDetails: results.errors
      },
      message: `Created ${results.created.length} policies, ${results.errors.length} failed`
    });
  } catch (error) {
    next(error);
  }
};
