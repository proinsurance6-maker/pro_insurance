import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthRequest } from '../middleware/auth';

export const getAllCompanies = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const companies = await prisma.insuranceCompany.findMany({
      where: { isActive: true },
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

export const createCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, code, contactPerson, email, phone } = req.body;

    const company = await prisma.insuranceCompany.create({
      data: { name, code, contactPerson, email, phone },
    });

    res.status(201).json({ success: true, data: company, message: 'Company created' });
  } catch (error) {
    next(error);
  }
};

export const getCompanyById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const company = await prisma.insuranceCompany.findUnique({
      where: { id },
      include: { _count: { select: { policies: true } } },
    });

    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const updated = await prisma.insuranceCompany.update({
      where: { id },
      data: req.body,
    });

    res.json({ success: true, data: updated, message: 'Company updated' });
  } catch (error) {
    next(error);
  }
};

export const deleteCompany = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await prisma.insuranceCompany.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Company deactivated' });
  } catch (error) {
    next(error);
  }
};
