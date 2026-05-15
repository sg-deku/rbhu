import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { sendWelcomeEmail } from '../services/email.service';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({ 
      success: true, 
      data: users, 
      pagination: { page, limit, total } 
    });
  } catch (error: any) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, role, organizationId } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // Generate random password
    const randomPassword = Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'USER',
        organizationId: organizationId || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Send welcome email
    await sendWelcomeEmail(user.email, user.name, user.role);

    res.status(201).json({ success: true, data: user });
  } catch (error: any) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error: any) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { name, role, organizationId } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        name,
        role,
        organizationId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: user });
  } catch (error: any) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) { 
    res.status(500).json({ success: false, message: error.message }); 
  }
};
