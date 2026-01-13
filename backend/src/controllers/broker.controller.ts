import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

// Get all brokers for the agent
export const getBrokers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = (req as any).user.userId;
    const { search, isActive } = req.query;

    const where: any = { agentId };
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { code: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const brokers = await prisma.broker.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { policies: true, commissions: true }
        }
      }
    });

    res.json({
      success: true,
      data: brokers
    });
  } catch (error) {
    next(error);
  }
};

// Get single broker by ID
export const getBrokerById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const broker = await prisma.broker.findFirst({
      where: { id, agentId },
      include: {
        _count: {
          select: { policies: true, commissions: true }
        }
      }
    });

    if (!broker) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Broker not found' }
      });
      return;
    }

    res.json({
      success: true,
      data: broker
    });
  } catch (error) {
    next(error);
  }
};

// Create a new broker
export const createBroker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = (req as any).user.userId;
    const { name, code, contactPerson, email, phone, address } = req.body;

    if (!name) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Broker name is required' }
      });
      return;
    }

    // Check if broker with same name already exists for this agent
    const existingBroker = await prisma.broker.findFirst({
      where: { agentId, name: { equals: name, mode: 'insensitive' } }
    });

    if (existingBroker) {
      res.status(400).json({
        success: false,
        error: { code: 'DUPLICATE', message: 'Broker with this name already exists' }
      });
      return;
    }

    const broker = await prisma.broker.create({
      data: {
        agentId,
        name,
        code: code || null,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
      }
    });

    res.status(201).json({
      success: true,
      data: broker
    });
  } catch (error) {
    next(error);
  }
};

// Update a broker
export const updateBroker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;
    const { name, code, contactPerson, email, phone, address, isActive } = req.body;

    // Check if broker exists and belongs to agent
    const existingBroker = await prisma.broker.findFirst({
      where: { id, agentId }
    });

    if (!existingBroker) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Broker not found' }
      });
      return;
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingBroker.name) {
      const duplicate = await prisma.broker.findFirst({
        where: { 
          agentId, 
          name: { equals: name, mode: 'insensitive' },
          id: { not: id }
        }
      });

      if (duplicate) {
        res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Broker with this name already exists' }
        });
        return;
      }
    }

    const broker = await prisma.broker.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      }
    });

    res.json({
      success: true,
      data: broker
    });
  } catch (error) {
    next(error);
  }
};

// Delete a broker (soft delete by setting isActive = false)
export const deleteBroker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const agentId = (req as any).user.userId;
    const { id } = req.params;

    const broker = await prisma.broker.findFirst({
      where: { id, agentId }
    });

    if (!broker) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Broker not found' }
      });
      return;
    }

    // Soft delete - set isActive to false
    await prisma.broker.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      data: { message: 'Broker deactivated successfully' }
    });
  } catch (error) {
    next(error);
  }
};
