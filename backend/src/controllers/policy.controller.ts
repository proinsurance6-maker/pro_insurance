import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { extractPolicyFromImage, extractPolicyFromText } from '../services/ocr.service';
import { uploadPolicyDocuments } from '../services/cloudinary.service';
import pdfParse from 'pdf-parse';

// ==========================================
// GET ALL POLICIES
// ==========================================
export const getPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { search, clientId, companyId, subAgentId, policyType, status, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { agentId };

    if (clientId) where.clientId = clientId;
    if (companyId) where.companyId = companyId;
    if (subAgentId) where.subAgentId = subAgentId;
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
          client: { select: { id: true, name: true, phone: true, clientCode: true, email: true } },
          company: { select: { id: true, name: true, code: true } },
          subAgent: { select: { id: true, name: true, subAgentCode: true } },
          broker: { select: { id: true, name: true } },
          commissions: true,
          documents: true
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
          odPremium: p.odPremium?.toString(),
          tpPremium: p.tpPremium?.toString(),
          netPremium: p.netPremium?.toString(),
          sumAssured: (p as any).sumAssuredText || p.sumAssured?.toString(), // Prefer text if set (Unlimited)
          commissions: p.commissions.map(c => ({
            ...c,
            totalCommissionPercent: c.totalCommissionPercent.toString(),
            totalCommissionAmount: c.totalCommissionAmount.toString(),
            agentCommissionAmount: c.agentCommissionAmount.toString(),
            subAgentCommissionAmount: c.subAgentCommissionAmount?.toString(),
            odCommissionPercent: c.odCommissionPercent?.toString(),
            tpCommissionPercent: c.tpCommissionPercent?.toString(),
            netCommissionPercent: c.netCommissionPercent?.toString(),
            subAgentOdPercent: (c as any).subAgentOdPercent?.toString(),
            subAgentTpPercent: (c as any).subAgentTpPercent?.toString(),
            subAgentNetPercent: (c as any).subAgentNetPercent?.toString()
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
      clientId, companyId, subAgentId, brokerId, familyMemberId,
      policyNumber, policyType, motorPolicyType, planName, policySource, policyPeriod,
      vehicleNumber, startDate, endDate,
      premiumAmount, sumAssured, premiumFrequency,
      // Motor premium breakdown
      odPremium, tpPremium, netPremium,
      // Commission rates - broker gives commission, agent keeps some, rest to sub-agent
      premiumPaidBy, 
      brokerCommissionAmount, // Total commission received from broker (manual input)
      commissionPercent, 
      odCommissionRate, tpCommissionRate, netCommissionRate, renewalCommissionRate,
      agentSharePercent, // Agent's share % of broker commission (rest goes to sub-agent)
      // Sub-agent commission rates (separate input)
      subAgentOdRate, subAgentTpRate, subAgentNetRate, subAgentCommissionRate,
      remarks
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

    // Calculate commission based on policy type
    const isMotor = policyType === 'Motor Insurance';
    let totalCommissionAmount = 0;
    let odCommissionAmount = 0;
    let tpCommissionAmount = 0;
    let netCommissionAmount = 0;
    let totalRate = commissionPercent || 15;

    // If broker commission is manually provided, use that
    if (brokerCommissionAmount && brokerCommissionAmount > 0) {
      totalCommissionAmount = parseFloat(brokerCommissionAmount);
    } else if (isMotor && motorPolicyType) {
      // Motor policy - calculate OD/TP based commission
      if (motorPolicyType === 'COMPREHENSIVE' || motorPolicyType === 'OD_ONLY') {
        odCommissionAmount = ((odPremium || 0) * (odCommissionRate || 0)) / 100;
      }
      if (motorPolicyType === 'COMPREHENSIVE' || motorPolicyType === 'TP_ONLY') {
        tpCommissionAmount = ((tpPremium || 0) * (tpCommissionRate || 0)) / 100;
      }
      if (netCommissionRate && netPremium) {
        netCommissionAmount = (netPremium * netCommissionRate) / 100;
      }
      totalCommissionAmount = odCommissionAmount + tpCommissionAmount + netCommissionAmount;
    } else {
      // Other policies - Net/Premium based commission
      const commissionBase = netPremium || premiumAmount;
      const rate = netCommissionRate || commissionPercent || 15;
      totalCommissionAmount = (commissionBase * rate) / 100;
      netCommissionAmount = totalCommissionAmount;
      totalRate = rate; // Update total rate to reflect actual commission rate used
    }

    // Get sub-agent commission based on explicit rates or share percentage
    let subAgentCommission = 0;
    let agentCommission = totalCommissionAmount;
    let subAgentSharePercentValue = 0;
    let subAgentOdPercentValue = subAgentOdRate ? parseFloat(subAgentOdRate) : null;
    let subAgentTpPercentValue = subAgentTpRate ? parseFloat(subAgentTpRate) : null;
    let subAgentNetPercentValue = subAgentNetRate ? parseFloat(subAgentNetRate) : (subAgentCommissionRate ? parseFloat(subAgentCommissionRate) : null);
    
    if (subAgentId) {
      const subAgent = await prisma.subAgent.findFirst({
        where: { id: subAgentId, agentId }
      });
      if (subAgent) {
        // Calculate sub-agent commission based on explicit rates if provided
        if (isMotor && (subAgentOdPercentValue || subAgentTpPercentValue || subAgentNetPercentValue)) {
          // Motor: Calculate based on OD/TP/Net rates
          if (subAgentNetPercentValue && subAgentNetPercentValue > 0) {
            const baseForNet = netPremium || premiumAmount;
            subAgentCommission = (baseForNet * subAgentNetPercentValue) / 100;
          } else {
            const subAgentOdComm = subAgentOdPercentValue ? ((odPremium || 0) * subAgentOdPercentValue) / 100 : 0;
            const subAgentTpComm = subAgentTpPercentValue ? ((tpPremium || 0) * subAgentTpPercentValue) / 100 : 0;
            subAgentCommission = subAgentOdComm + subAgentTpComm;
          }
        } else if (!isMotor && subAgentNetPercentValue && subAgentNetPercentValue > 0) {
          // Non-motor: Use subAgentCommissionRate/subAgentNetRate
          const baseForNet = netPremium || premiumAmount;
          subAgentCommission = (baseForNet * subAgentNetPercentValue) / 100;
        } else if (agentSharePercent !== undefined && agentSharePercent > 0) {
          // Fallback: Use agent share percent
          const agentKeeps = parseFloat(agentSharePercent);
          subAgentSharePercentValue = 100 - agentKeeps;
          subAgentCommission = (totalCommissionAmount * subAgentSharePercentValue) / 100;
        } else {
          // No explicit sub-agent commission rate provided → Agent keeps 100%, sub-agent gets 0%
          // Sub-agent is selected only for tracking/reference, not for commission split
          subAgentCommission = 0;
          subAgentSharePercentValue = 0;
        }
        
        agentCommission = totalCommissionAmount - subAgentCommission;
        
        // Calculate share percent for display
        if (totalCommissionAmount > 0) {
          subAgentSharePercentValue = (subAgentCommission / totalCommissionAmount) * 100;
        }
      }
    }

    const policy = await prisma.$transaction(async (tx) => {
      const newPolicy = await tx.policy.create({
        data: {
          agentId,
          clientId,
          companyId,
          subAgentId: subAgentId || null,
          brokerId: brokerId || null,
          familyMemberId: familyMemberId || null,
          policyNumber,
          policyType,
          motorPolicyType: isMotor ? motorPolicyType : null,
          planName,
          policySource: policySource || 'NEW',
          policyPeriod: policyPeriod || null,
          vehicleNumber: isMotor ? vehicleNumber : null,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          premiumAmount,
          odPremium: isMotor ? odPremium : null,
          tpPremium: isMotor ? tpPremium : null,
          netPremium: netPremium || null,
          // Handle sumAssured - if "Unlimited" or text, store in sumAssuredText
          sumAssured: sumAssured && !isNaN(parseFloat(sumAssured)) ? parseFloat(sumAssured) : null,
          sumAssuredText: sumAssured && isNaN(parseFloat(sumAssured)) ? sumAssured : null,
          premiumFrequency: premiumFrequency || 'yearly',
          premiumPaidBy: premiumPaidBy || 'CLIENT'
        }
      });

      await tx.commission.create({
        data: {
          policyId: newPolicy.id,
          agentId,
          subAgentId: subAgentId || null,
          brokerId: brokerId || null,
          companyId,
          // Broker commission (total received from broker)
          brokerCommissionAmount: brokerCommissionAmount ? parseFloat(brokerCommissionAmount) : null,
          totalCommissionPercent: totalRate,
          totalCommissionAmount: totalCommissionAmount,
          // Motor-specific commission breakdown
          odCommissionPercent: isMotor ? odCommissionRate : null,
          odCommissionAmount: isMotor ? odCommissionAmount : null,
          tpCommissionPercent: isMotor ? tpCommissionRate : null,
          tpCommissionAmount: isMotor ? tpCommissionAmount : null,
          netCommissionPercent: netCommissionRate || null,
          netCommissionAmount: netCommissionAmount || null,
          renewalCommissionPercent: renewalCommissionRate || null,
          // Agent/SubAgent split
          agentCommissionAmount: agentCommission,
          subAgentCommissionAmount: subAgentCommission || null,
          subAgentSharePercent: subAgentSharePercentValue || null,
          // Sub-Agent specific rates
          subAgentOdPercent: subAgentOdPercentValue || null,
          subAgentTpPercent: subAgentTpPercentValue || null,
          subAgentNetPercent: subAgentNetPercentValue || null
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

    // Upload documents if provided
    let uploadedDocuments = {};
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (files && Object.keys(files).length > 0) {
      try {
        const documentFiles = {
          policyCopy: files.policyCopy?.[0],
          rcDocument: files.rcDocument?.[0],
          aadharFront: files.aadharFront?.[0],
          aadharBack: files.aadharBack?.[0],
          panCard: files.panCard?.[0],
          photo: files.photo?.[0],
          cancelCheque: files.cancelCheque?.[0],
        };

        uploadedDocuments = await uploadPolicyDocuments(documentFiles, policyNumber);
        
        // Save document URLs to database
        if (Object.keys(uploadedDocuments).length > 0) {
          await prisma.document.createMany({
            data: Object.entries(uploadedDocuments).map(([type, doc]: [string, any]) => {
              // Ensure filename has proper extension
              const extension = doc.format || (doc.resource_type === 'raw' ? 'pdf' : 'jpg');
              const baseFilename = doc.original_filename || type;
              const documentName = baseFilename.includes('.') ? baseFilename : `${baseFilename}.${extension}`;
              
              return {
                policyId: policy.id,
                agentId,
                documentType: type.toUpperCase() as any,
                documentName,
                documentUrl: doc.secure_url,
                mimeType: doc.resource_type === 'raw' ? 'application/pdf' : `image/${doc.format}`,
                fileSize: doc.bytes,
                uploadedAt: new Date()
              };
            })
          });
        }
      } catch (uploadError) {
        console.error('Document upload failed:', uploadError);
        // Don't fail policy creation if document upload fails
      }
    }

    const fullPolicy = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: { client: true, company: true, commissions: true, documents: true }
    });

    res.status(201).json({
      success: true,
      data: {
        ...fullPolicy,
        uploadedDocuments: Object.keys(uploadedDocuments)
      },
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
// CREATE INSURANCE COMPANY
// ==========================================
export const createCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code } = req.body;

    if (!name) {
      throw new AppError('Company name is required', 400, 'VALIDATION_ERROR');
    }

    // Generate code from name if not provided
    const companyCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

    // Check if company already exists
    const existingCompany = await prisma.insuranceCompany.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { code: { equals: companyCode, mode: 'insensitive' } }
        ]
      }
    });

    if (existingCompany) {
      // Return existing company instead of error
      res.json({
        success: true,
        data: existingCompany,
        message: 'Company already exists'
      });
      return;
    }

    const company = await prisma.insuranceCompany.create({
      data: {
        name,
        code: companyCode
      }
    });

    res.status(201).json({
      success: true,
      data: company
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
        'OCR feature is not available. Please contact support or enter policy details manually.',
        400,
        'OCR_NOT_AVAILABLE'
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const isPDF = file.mimetype === 'application/pdf';
    
    if (!allowedImageTypes.includes(file.mimetype) && !isPDF) {
      throw new AppError('Invalid file type. Please upload an image (JPG, PNG) or PDF.', 400, 'INVALID_FILE_TYPE');
    }

    // For PDFs, we'll extract text instead of using vision
    if (isPDF) {
      try {
        const pdfData = await pdfParse(file.buffer);
        
        // Only proceed with text extraction if we got meaningful text
        if (pdfData.text && pdfData.text.trim().length > 50) {
          try {
            const extractedData = await extractPolicyFromText(pdfData.text);
            
            return res.json({
              success: true,
              data: extractedData,
              message: 'PDF processed successfully! Please verify the extracted details.'
            });
          } catch (textErr) {
            console.warn('PDF text extraction failed, falling back to image-based extraction...');
            // Fall through to image-based extraction below
          }
        } else {
          console.warn('PDF text extraction yielded insufficient data, using image-based extraction...');
          // Fall through to image-based extraction below
        }
      } catch (err) {
        console.warn('PDF parsing failed:', (err as any).message);
        // Fall through to image-based extraction below
      }
      
      // Fallback: Try image-based extraction on PDF
      // Note: This requires pdf2pic or similar library to convert PDF to image
      // For now, we'll inform user to upload image instead
      throw new AppError(
        '📄 PDF upload detected: This PDF appears to be image-based or has unsearchable text. Please upload a clear JPG/PNG image of the policy instead for better OCR extraction.',
        400,
        'PDF_TEXT_EXTRACTION_FAILED'
      );
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
    if (error.message?.includes('PDF') || error.message?.includes('text extraction')) {
      return next(error); // Pass through the improved error message
    }
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

// ==========================================
// SEARCH CLIENTS BY NAME, POLICY NUMBER, OR VEHICLE NUMBER
// ==========================================
export const searchClientsForPolicy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { query } = req.query;

    if (!query || (query as string).length < 2) {
      return res.json({ success: true, data: [] });
    }

    const searchTerm = query as string;

    // Search clients with their policies and extract vehicle numbers
    const clients = await prisma.client.findMany({
      where: {
        agentId,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm } },
          { policies: { some: { policyNumber: { contains: searchTerm, mode: 'insensitive' } } } },
          { policies: { some: { vehicleNumber: { contains: searchTerm, mode: 'insensitive' } } } }
        ]
      },
      include: {
        policies: {
          select: {
            id: true,
            policyNumber: true,
            vehicleNumber: true,
            policyType: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Limit to recent 5 policies
        }
      },
      take: 10 // Limit results
    });

    // Transform data to include unique vehicle numbers
    const transformedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      policies: client.policies,
      vehicles: [...new Set(client.policies.map(p => p.vehicleNumber).filter(Boolean))] // Unique vehicles
    }));

    res.json({
      success: true,
      data: transformedClients
    });
  } catch (error) {
    next(error);
  }
};

