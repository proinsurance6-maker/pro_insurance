import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

// ==========================================
// GET LEDGER ENTRIES
// ==========================================
export const getLedgerEntries = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId, entryType, startDate, endDate, page = '1', limit = '50' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const where: any = { agentId };

    if (clientId) where.clientId = clientId;
    if (entryType) where.entryType = entryType;

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate as string);
      if (endDate) where.entryDate.lte = new Date(endDate as string);
    }

    const [entries, total, debitSum, creditSum] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, clientCode: true } },
          policy: { select: { id: true, policyNumber: true, policyType: true } }
        },
        orderBy: { entryDate: 'desc' },
        skip,
        take
      }),
      prisma.ledgerEntry.count({ where }),
      prisma.ledgerEntry.aggregate({
        where: { ...where, entryType: 'DEBIT' },
        _sum: { amount: true }
      }),
      prisma.ledgerEntry.aggregate({
        where: { ...where, entryType: 'CREDIT' },
        _sum: { amount: true }
      })
    ]);

    const debitTotal = Number(debitSum._sum.amount || 0);
    const creditTotal = Number(creditSum._sum.amount || 0);

    res.json({
      success: true,
      data: {
        entries: entries.map(e => ({
          ...e,
          amount: e.amount.toString()
        })),
        summary: {
          totalDebit: debitTotal.toString(),
          totalCredit: creditTotal.toString(),
          balance: (debitTotal - creditTotal).toString()
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
// CREATE DEBIT ENTRY
// ==========================================
export const createDebitEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId, amount, description, entryDate } = req.body;

    if (!clientId || !amount) {
      throw new AppError('Client and amount are required', 400, 'VALIDATION_ERROR');
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const entry = await prisma.$transaction(async (tx) => {
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          agentId,
          clientId,
          entryType: 'DEBIT',
          amount,
          description: description || 'Manual debit entry',
          entryDate: entryDate ? new Date(entryDate) : new Date()
        },
        include: { client: true }
      });

      await tx.client.update({
        where: { id: clientId },
        data: { pendingAmount: { increment: amount } }
      });

      return ledgerEntry;
    });

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        amount: entry.amount.toString()
      },
      message: 'Debit entry created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE COLLECTION ENTRY
// ==========================================
export const createCollectionEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId, amount, paymentMode, reference, description, entryDate } = req.body;

    if (!clientId || !amount) {
      throw new AppError('Client and amount are required', 400, 'VALIDATION_ERROR');
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const entry = await prisma.$transaction(async (tx) => {
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          agentId,
          clientId,
          entryType: 'CREDIT',
          amount,
          description: description || `Payment received via ${paymentMode || 'Cash'}`,
          reference,
          entryDate: entryDate ? new Date(entryDate) : new Date()
        },
        include: { client: true }
      });

      await tx.client.update({
        where: { id: clientId },
        data: { pendingAmount: { decrement: amount } }
      });

      return ledgerEntry;
    });

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        amount: entry.amount.toString()
      },
      message: 'Collection recorded successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET CLIENT KHATA
// ==========================================
export const getClientKhata = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;

    const client = await prisma.client.findFirst({
      where: { id: clientId, agentId }
    });

    if (!client) {
      throw new AppError('Client not found', 404, 'NOT_FOUND');
    }

    const where: any = { clientId };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate as string);
      if (endDate) where.entryDate.lte = new Date(endDate as string);
    }

    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: { policy: { select: { policyNumber: true, policyType: true } } },
      orderBy: { entryDate: 'asc' }
    });

    let runningBalance = 0;
    const statement = entries.map(entry => {
      if (entry.entryType === 'DEBIT') {
        runningBalance += Number(entry.amount);
      } else {
        runningBalance -= Number(entry.amount);
      }
      return {
        ...entry,
        amount: entry.amount.toString(),
        runningBalance: runningBalance.toString()
      };
    });

    const debitTotal = entries.filter(e => e.entryType === 'DEBIT').reduce((sum, e) => sum + Number(e.amount), 0);
    const creditTotal = entries.filter(e => e.entryType === 'CREDIT').reduce((sum, e) => sum + Number(e.amount), 0);

    res.json({
      success: true,
      data: {
        client: {
          id: client.id,
          name: client.name,
          phone: client.phone,
          clientCode: client.clientCode,
          currentPending: client.pendingAmount.toString()
        },
        statement: statement.reverse(),
        summary: {
          totalDebit: debitTotal.toString(),
          totalCollection: creditTotal.toString(),
          pendingAmount: client.pendingAmount.toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET PENDING COLLECTIONS
// ==========================================
export const getPendingCollections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;

    const clients = await prisma.client.findMany({
      where: {
        agentId,
        pendingAmount: { gt: 0 }
      },
      orderBy: { pendingAmount: 'desc' },
      select: {
        id: true,
        name: true,
        phone: true,
        clientCode: true,
        pendingAmount: true,
        _count: { select: { policies: true } }
      }
    });

    const totalPending = clients.reduce((sum, c) => sum + Number(c.pendingAmount), 0);

    res.json({
      success: true,
      data: {
        clients: clients.map(c => ({
          ...c,
          pendingAmount: c.pendingAmount.toString()
        })),
        summary: {
          totalClients: clients.length,
          totalPendingAmount: totalPending.toString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE LEDGER ENTRY
// ==========================================
export const updateLedgerEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { description, entryDate } = req.body;

    const entry = await prisma.ledgerEntry.findFirst({
      where: { id, agentId }
    });

    if (!entry) {
      throw new AppError('Ledger entry not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.ledgerEntry.update({
      where: { id },
      data: {
        description,
        entryDate: entryDate ? new Date(entryDate) : undefined
      }
    });

    res.json({
      success: true,
      data: {
        ...updated,
        amount: updated.amount.toString()
      },
      message: 'Ledger entry updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE LEDGER ENTRY
// ==========================================
export const deleteLedgerEntry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const entry = await prisma.ledgerEntry.findFirst({
      where: { id, agentId }
    });

    if (!entry) {
      throw new AppError('Ledger entry not found', 404, 'NOT_FOUND');
    }

    if (!entry.clientId) {
      throw new AppError('Cannot delete entry without client', 400, 'INVALID_ENTRY');
    }

    await prisma.$transaction(async (tx) => {
      if (entry.entryType === 'DEBIT') {
        await tx.client.update({
          where: { id: entry.clientId! },
          data: { pendingAmount: { decrement: entry.amount } }
        });
      } else {
        await tx.client.update({
          where: { id: entry.clientId! },
          data: { pendingAmount: { increment: entry.amount } }
        });
      }

      await tx.ledgerEntry.delete({ where: { id } });
    });

    res.json({
      success: true,
      message: 'Ledger entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SUB-AGENT LEDGER
// ==========================================
export const getSubAgentLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { subAgentId } = req.params;

    // Verify sub-agent belongs to this agent
    const subAgent = await prisma.subAgent.findFirst({
      where: { id: subAgentId, agentId }
    });

    if (!subAgent) {
      throw new AppError('Sub-agent not found', 404, 'NOT_FOUND');
    }

    const entries = await prisma.ledgerEntry.findMany({
      where: { 
        agentId,
        subAgentId 
      },
      include: {
        policy: { select: { id: true, policyNumber: true } }
      },
      orderBy: { entryDate: 'desc' }
    });

    res.json({
      success: true,
      data: entries.map(e => ({
        ...e,
        amount: e.amount.toString()
      }))
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CREATE SUB-AGENT PAYOUT
// ==========================================
export const createSubAgentPayout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agentId = (req as any).user.userId;
    const { subAgentId, amount, description, entryDate } = req.body;

    if (!subAgentId || !amount) {
      throw new AppError('Sub-agent ID and amount are required', 400, 'VALIDATION_ERROR');
    }

    const subAgent = await prisma.subAgent.findFirst({
      where: { id: subAgentId, agentId }
    });

    if (!subAgent) {
      throw new AppError('Sub-agent not found', 404, 'NOT_FOUND');
    }

    const entry = await prisma.$transaction(async (tx) => {
      // Create ledger entry for sub-agent payout (DEBIT = money paid out)
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          agentId,
          subAgentId,
          entryType: 'DEBIT',
          amount: parseFloat(amount),
          description: description || 'Commission Payout',
          entryDate: entryDate ? new Date(entryDate) : new Date(),
        }
      });

      // Update sub-agent ledger balance (decrease - money paid out)
      await tx.subAgent.update({
        where: { id: subAgentId },
        data: { ledgerBalance: { decrement: parseFloat(amount) } }
      });

      return ledgerEntry;
    });

    res.status(201).json({
      success: true,
      data: {
        ...entry,
        amount: entry.amount.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};
