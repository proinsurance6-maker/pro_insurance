import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// ==========================================
// GET ALL CLIENTS
// ==========================================
export const getClients = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { search, page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { agentId };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { clientCode: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        include: {
          familyMembers: true,
          _count: { select: { policies: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.client.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        clients: clients.map(c => ({
          id: c.id,
          clientCode: c.clientCode,
          name: c.name,
          phone: c.phone,
          email: c.email,
          pendingAmount: c.pendingAmount.toString(),
          policyCount: c._count.policies,
          familyMembers: c.familyMembers,
          isActive: c.isActive,
          createdAt: c.createdAt
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
// GET SINGLE CLIENT
// ==========================================
export const getClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const client = await prisma.client.findFirst({
      where: { id, agentId },
      include: {
        familyMembers: true,
        policies: {
          include: { company: true },
          orderBy: { createdAt: 'desc' }
        },
        ledgerEntries: {
          orderBy: { entryDate: 'desc' },
          take: 20
        }
      }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...client,
        pendingAmount: client.pendingAmount.toString(),
        policies: client.policies.map(p => ({
          ...p,
          premiumAmount: p.premiumAmount.toString(),
          sumAssured: p.sumAssured?.toString()
        })),
        ledgerEntries: client.ledgerEntries.map(e => ({
          ...e,
          amount: e.amount.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE CLIENT
// ==========================================
export const createClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { name, phone, email, address, dateOfBirth, panNumber, aadhaarNumber, familyMembers } = req.body;

    if (!name || !phone) {
      throw new AppError('Name and phone are required', 400, 'VALIDATION_ERROR');
    }

    const existing = await prisma.client.findFirst({
      where: { phone, agentId }
    });

    if (existing) {
      throw new AppError('Client with this phone already exists', 400, 'DUPLICATE_PHONE');
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    const count = await prisma.client.count({ where: { agentId } });
    const clientCode = `${agent?.agentCode}-C${String(count + 1).padStart(3, '0')}`;

    const client = await prisma.client.create({
      data: {
        agentId,
        clientCode,
        name,
        phone,
        email,
        address,
        panNumber,
        aadhaarNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        isActive: true,
        familyMembers: familyMembers ? {
          create: familyMembers.map((fm: any) => ({
            name: fm.name,
            relationship: fm.relationship || fm.relation,
            dateOfBirth: fm.dateOfBirth ? new Date(fm.dateOfBirth) : null,
            panNumber: fm.panNumber,
            aadhaarNumber: fm.aadhaarNumber
          }))
        } : undefined
      },
      include: { familyMembers: true }
    });

    res.status(201).json({
      success: true,
      data: {
        ...client,
        pendingAmount: client.pendingAmount.toString()
      },
      message: 'Client created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE CLIENT
// ==========================================
export const updateClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { name, phone, email, address, dateOfBirth, panNumber, aadhaarNumber, isActive } = req.body;

    const client = await prisma.client.findFirst({
      where: { id, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        address,
        panNumber,
        aadhaarNumber,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        isActive
      },
      include: { familyMembers: true }
    });

    res.json({
      success: true,
      data: {
        ...updated,
        pendingAmount: updated.pendingAmount.toString()
      },
      message: 'Client updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE CLIENT
// ==========================================
export const deleteClient = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const client = await prisma.client.findFirst({
      where: { id, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    await prisma.client.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      message: 'Client deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ADD FAMILY MEMBER
// ==========================================
export const addFamilyMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId } = req.params;
    const { name, relationship, dateOfBirth, panNumber, aadhaarNumber } = req.body;

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const member = await prisma.familyMember.create({
      data: {
        clientId,
        name,
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        panNumber,
        aadhaarNumber
      }
    });

    res.status(201).json({
      success: true,
      data: member,
      message: 'Family member added successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE FAMILY MEMBER
// ==========================================
export const updateFamilyMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId, memberId } = req.params;
    const { name, relationship, dateOfBirth, panNumber, aadhaarNumber } = req.body;

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const member = await prisma.familyMember.update({
      where: { id: memberId },
      data: {
        name,
        relationship,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        panNumber,
        aadhaarNumber
      }
    });

    res.json({
      success: true,
      data: member,
      message: 'Family member updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE FAMILY MEMBER
// ==========================================
export const deleteFamilyMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId, memberId } = req.params;

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    await prisma.familyMember.delete({
      where: { id: memberId }
    });

    res.json({
      success: true,
      message: 'Family member deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CLIENT LEDGER
// ==========================================
export const getClientLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const client = await prisma.client.findFirst({
      where: { id, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const where: any = { clientId: id };
    
    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate as string);
      if (endDate) where.entryDate.lte = new Date(endDate as string);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { entryDate: 'desc' }
    });

    res.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          pendingAmount: client.pendingAmount.toString()
        },
        entries: entries.map(e => ({
          ...e,
          amount: e.amount.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};
