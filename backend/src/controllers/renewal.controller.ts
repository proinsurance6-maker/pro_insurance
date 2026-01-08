import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// ==========================================
// GET UPCOMING RENEWALS
// ==========================================
export const getUpcomingRenewals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { days = '30', page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days as string));

    const where = {
      policy: { agentId },
      renewalDate: {
        gte: new Date(),
        lte: futureDate
      },
      renewalStatus: 'pending'
    };

    const [renewals, total] = await Promise.all([
      prisma.renewal.findMany({
        where,
        include: {
          policy: {
            include: {
              client: { select: { id: true, name: true, phone: true, clientCode: true } },
              company: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { renewalDate: 'asc' },
        skip,
        take
      }),
      prisma.renewal.count({ where })
    ]);

    const today = new Date();
    const categorized = renewals.map(r => {
      const daysLeft = Math.ceil((r.renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      let urgency = 'normal';
      if (daysLeft <= 7) urgency = 'critical';
      else if (daysLeft <= 15) urgency = 'high';

      return {
        id: r.id,
        policyId: r.policyId,
        policyNumber: r.policy.policyNumber,
        policyType: r.policy.policyType,
        clientName: r.policy.client.name,
        clientPhone: r.policy.client.phone,
        companyName: r.policy.company.name,
        premiumAmount: r.policy.premiumAmount.toString(),
        renewalDate: r.renewalDate,
        daysLeft,
        urgency,
        renewalStatus: r.renewalStatus,
        remindersSent: {
          day30: r.reminder30DaysSent,
          day15: r.reminder15DaysSent,
          day7: r.reminder7DaysSent,
          day1: r.reminder1DaySent
        }
      };
    });

    res.json({
      success: true,
      data: {
        renewals: categorized,
        summary: {
          critical: categorized.filter(r => r.urgency === 'critical').length,
          high: categorized.filter(r => r.urgency === 'high').length,
          normal: categorized.filter(r => r.urgency === 'normal').length
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
// GET EXPIRED POLICIES
// ==========================================
export const getExpiredPolicies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { days = '30', page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - parseInt(days as string));

    const where = {
      policy: { agentId },
      renewalDate: {
        lt: new Date(),
        gte: pastDate
      },
      renewalStatus: 'pending'
    };

    const [renewals, total] = await Promise.all([
      prisma.renewal.findMany({
        where,
        include: {
          policy: {
            include: {
              client: { select: { id: true, name: true, phone: true, clientCode: true } },
              company: { select: { id: true, name: true, code: true } }
            }
          }
        },
        orderBy: { renewalDate: 'desc' },
        skip,
        take
      }),
      prisma.renewal.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        renewals: renewals.map(r => ({
          id: r.id,
          policyId: r.policyId,
          policyNumber: r.policy.policyNumber,
          policyType: r.policy.policyType,
          clientName: r.policy.client.name,
          clientPhone: r.policy.client.phone,
          companyName: r.policy.company.name,
          premiumAmount: r.policy.premiumAmount.toString(),
          renewalDate: r.renewalDate,
          daysExpired: Math.ceil((new Date().getTime() - r.renewalDate.getTime()) / (1000 * 60 * 60 * 24))
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
// MARK RENEWAL AS DONE
// ==========================================
export const markRenewed = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const renewal = await prisma.renewal.findFirst({
      where: { id, policy: { agentId } }
    });

    if (!renewal) {
      throw new AppError('Renewal not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.renewal.update({
      where: { id },
      data: { 
        renewalStatus: 'renewed',
        renewedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Renewal marked as done'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SEND RENEWAL REMINDER
// ==========================================
export const sendRenewalReminder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { channel = 'whatsapp' } = req.body;

    const renewal = await prisma.renewal.findFirst({
      where: { id, policy: { agentId } },
      include: {
        policy: {
          include: {
            client: true,
            company: true
          }
        }
      }
    });

    if (!renewal) {
      throw new AppError('Renewal not found', 404, 'NOT_FOUND');
    }

    // TODO: Integrate with WhatsApp/SMS API
    console.log(`📱 Sending ${channel} reminder to ${renewal.policy.client.phone}`);
    console.log(`Policy: ${renewal.policy.policyNumber}`);
    console.log(`Renewal Date: ${renewal.renewalDate}`);

    if (channel === 'whatsapp') {
      await prisma.renewal.update({
        where: { id },
        data: { whatsappSent: true }
      });
    }

    res.json({
      success: true,
      message: `Reminder sent via ${channel} to ${renewal.policy.client.phone}`
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET RENEWAL CALENDAR
// ==========================================
export const getRenewalCalendar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { month, year } = req.query;

    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const renewals = await prisma.renewal.findMany({
      where: {
        policy: { agentId },
        renewalDate: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        policy: {
          include: {
            client: { select: { name: true, phone: true } },
            company: { select: { name: true } }
          }
        }
      },
      orderBy: { renewalDate: 'asc' }
    });

    const calendar: { [key: string]: any[] } = {};
    
    renewals.forEach(r => {
      const dateKey = r.renewalDate.toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push({
        id: r.id,
        policyNumber: r.policy.policyNumber,
        clientName: r.policy.client.name,
        clientPhone: r.policy.client.phone,
        companyName: r.policy.company.name,
        premium: r.policy.premiumAmount.toString(),
        renewalStatus: r.renewalStatus
      });
    });

    res.json({
      success: true,
      data: {
        month: targetMonth + 1,
        year: targetYear,
        calendar,
        summary: {
          total: renewals.length,
          renewed: renewals.filter(r => r.renewalStatus === 'renewed').length,
          pending: renewals.filter(r => r.renewalStatus === 'pending').length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET TODAY'S RENEWALS
// ==========================================
export const getTodaysRenewals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const renewals = await prisma.renewal.findMany({
      where: {
        policy: { agentId },
        renewalDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        renewalStatus: 'pending'
      },
      include: {
        policy: {
          include: {
            client: { select: { id: true, name: true, phone: true } },
            company: { select: { name: true } }
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        count: renewals.length,
        renewals: renewals.map(r => ({
          id: r.id,
          policyId: r.policyId,
          policyNumber: r.policy.policyNumber,
          policyType: r.policy.policyType,
          clientName: r.policy.client.name,
          clientPhone: r.policy.client.phone,
          companyName: r.policy.company.name,
          premium: r.policy.premiumAmount.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
