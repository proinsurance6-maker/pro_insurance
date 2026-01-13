import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { uploadSubAgentKyc as uploadKycToCloudinary } from '../services/cloudinary.service';

// ==========================================
// GET AGENT DASHBOARD STATS
// ==========================================
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;

    const [
      totalClients,
      totalPolicies,
      activePolicies,
      totalPremium,
      pendingCollection,
      upcomingRenewals,
      recentPolicies,
      subAgentCount,
      subscription
    ] = await Promise.all([
      prisma.client.count({ where: { agentId, isActive: true } }),
      prisma.policy.count({ where: { agentId } }),
      prisma.policy.count({ 
        where: { agentId, endDate: { gte: new Date() } }
      }),
      prisma.policy.aggregate({
        where: { agentId },
        _sum: { premiumAmount: true }
      }),
      prisma.client.aggregate({
        where: { agentId },
        _sum: { pendingAmount: true }
      }),
      prisma.renewal.count({
        where: {
          policy: { agentId },
          renewalDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          renewalStatus: 'pending'
        }
      }),
      prisma.policy.findMany({
        where: { agentId },
        include: { client: true, company: true },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      prisma.subAgent.count({ where: { agentId, isActive: true } }),
      prisma.subscription.findUnique({ where: { agentId } })
    ]);

    let daysLeft = 0;
    if (subscription) {
      if (subscription.status === 'TRIAL' && subscription.trialEndDate) {
        daysLeft = Math.ceil((subscription.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      } else if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd) {
        daysLeft = Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      }
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalClients,
          totalPolicies,
          activePolicies,
          totalPremium: totalPremium._sum.premiumAmount?.toString() || '0',
          pendingCollection: pendingCollection._sum.pendingAmount?.toString() || '0',
          upcomingRenewals,
          subAgentCount
        },
        subscription: {
          status: subscription?.status || 'EXPIRED',
          daysLeft: Math.max(0, daysLeft),
          trialEndDate: subscription?.trialEndDate,
          currentPeriodEnd: subscription?.currentPeriodEnd
        },
        recentPolicies: recentPolicies.map(p => ({
          id: p.id,
          policyNumber: p.policyNumber,
          clientName: p.client.name,
          companyName: p.company.name,
          premiumAmount: p.premiumAmount.toString(),
          endDate: p.endDate,
          createdAt: p.createdAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE AGENT PROFILE
// ==========================================
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { name, email, address, panNumber, aadhaarNumber, bankDetails } = req.body;

    const agent = await prisma.agent.update({
      where: { id: agentId },
      data: { name, email, address, panNumber, aadhaarNumber, bankDetails }
    });

    res.json({
      success: true,
      data: agent,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET AGENT SUB-AGENTS
// ==========================================
export const getSubAgents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const subAgents = await prisma.subAgent.findMany({
      where: { agentId },
      include: {
        _count: {
          select: {
            policies: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get client counts separately as SubAgent doesn't directly relate to clients
    const subAgentsWithCounts = await Promise.all(
      subAgents.map(async (subAgent) => {
        const clientCount = await prisma.client.count({
          where: { 
            policies: { 
              some: { subAgentId: subAgent.id } 
            } 
          }
        });

        return {
          ...subAgent,
          commissionPercentage: subAgent.commissionPercentage.toString(),
          ledgerBalance: subAgent.ledgerBalance.toString(),
          _count: {
            policies: subAgent._count.policies,
            clients: clientCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: subAgentsWithCounts
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE SUB-AGENT
// ==========================================
export const createSubAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { name, phone, email, address, panNumber, commissionPercentage } = req.body;

    const existing = await prisma.subAgent.findFirst({
      where: { phone, agentId }
    });

    if (existing) {
      throw new AppError('Sub-agent with this phone already exists', 400, 'DUPLICATE_PHONE');
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    const count = await prisma.subAgent.count({ where: { agentId } });
    const subAgentCode = `${agent?.agentCode}-S${String(count + 1).padStart(2, '0')}`;

    const subAgent = await prisma.subAgent.create({
      data: {
        agentId,
        subAgentCode,
        name,
        phone,
        email,
        address,
        panNumber,
        commissionPercentage: commissionPercentage || 50,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...subAgent,
        commissionPercentage: subAgent.commissionPercentage.toString(),
        ledgerBalance: subAgent.ledgerBalance.toString()
      },
      message: 'Sub-agent created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE SUB-AGENT
// ==========================================
export const updateSubAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { name, email, address, panNumber, commissionPercentage, isActive } = req.body;

    const subAgent = await prisma.subAgent.findFirst({
      where: { id, agentId }
    });

    if (!subAgent) {
      throw new AppError('Sub-agent not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.subAgent.update({
      where: { id },
      data: { name, email, address, panNumber, commissionPercentage, isActive }
    });

    res.json({
      success: true,
      data: {
        ...updated,
        commissionPercentage: updated.commissionPercentage.toString(),
        ledgerBalance: updated.ledgerBalance.toString()
      },
      message: 'Sub-agent updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE SUB-AGENT
// ==========================================
export const deleteSubAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const subAgent = await prisma.subAgent.findFirst({
      where: { id, agentId }
    });

    if (!subAgent) {
      throw new AppError('Sub-agent not found', 404, 'NOT_FOUND');
    }

    await prisma.subAgent.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Sub-agent deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPLOAD SUB-AGENT KYC DOCUMENTS
// ==========================================
export const uploadSubAgentKyc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400, 'NO_FILES');
    }

    const subAgent = await prisma.subAgent.findFirst({
      where: { id, agentId }
    });

    if (!subAgent) {
      throw new AppError('Sub-agent not found', 404, 'NOT_FOUND');
    }

    // Upload to Cloudinary
    const uploadedDocuments = await uploadKycToCloudinary(files, subAgent.subAgentCode);

    // Update sub-agent with KYC info
    await prisma.subAgent.update({
      where: { id },
      data: { 
        kycStatus: 'SUBMITTED',
        kycDocuments: JSON.stringify(uploadedDocuments.map(doc => ({
          fileName: doc.original_filename,
          fileUrl: doc.secure_url,
          publicId: doc.public_id,
          uploadDate: new Date(),
          fileSize: doc.bytes,
          format: doc.format
        })))
      }
    });

    res.json({
      success: true,
      data: { 
        uploadedFiles: uploadedDocuments.length,
        documents: uploadedDocuments 
      },
      message: 'KYC documents uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET MONTHLY REPORT
// ==========================================
export const getMonthlyReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { month, year } = req.query;

    const targetMonth = month ? parseInt(month as string) : new Date().getMonth();
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const [newPolicies, renewedPolicies, commissions, collections] = await Promise.all([
      prisma.policy.findMany({
        where: {
          agentId,
          createdAt: { gte: startDate, lte: endDate }
        },
        include: { client: true, company: true }
      }),
      prisma.renewal.findMany({
        where: {
          policy: { agentId },
          renewalStatus: 'renewed',
          renewedAt: { gte: startDate, lte: endDate }
        },
        include: { policy: { include: { client: true, company: true } } }
      }),
      prisma.commission.aggregate({
        where: {
          agentId,
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalCommissionAmount: true }
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          agentId,
          entryType: 'CREDIT',
          entryDate: { gte: startDate, lte: endDate }
        },
        _sum: { amount: true }
      })
    ]);

    const totalPremium = newPolicies.reduce((sum, p) => sum + Number(p.premiumAmount), 0);

    res.json({
      success: true,
      data: {
        period: { month: targetMonth + 1, year: targetYear },
        summary: {
          newPoliciesCount: newPolicies.length,
          renewedPoliciesCount: renewedPolicies.length,
          totalPremium: totalPremium.toString(),
          totalCommission: commissions._sum.totalCommissionAmount?.toString() || '0',
          totalCollections: collections._sum.amount?.toString() || '0'
        },
        newPolicies: newPolicies.map(p => ({
          policyNumber: p.policyNumber,
          clientName: p.client.name,
          companyName: p.company.name,
          premium: p.premiumAmount.toString(),
          date: p.createdAt
        })),
        renewedPolicies: renewedPolicies.map(r => ({
          policyNumber: r.policy.policyNumber,
          clientName: r.policy.client.name,
          companyName: r.policy.company.name,
          date: r.renewedAt
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
