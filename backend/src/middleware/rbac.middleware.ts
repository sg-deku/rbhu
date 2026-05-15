import { Request, Response, NextFunction } from 'express';

type Role = 'USER' | 'ADMIN' | 'MODERATOR' | 'SUPERADMIN';

// Permission map
const permissions: Record<Role, string[]> = {
  USER: ['read:own', 'update:own', 'delete:own'],
  MODERATOR: ['read:own', 'read:any', 'update:own', 'update:any', 'delete:own'],
  ADMIN: ['read:own', 'read:any', 'update:own', 'update:any', 'delete:own', 'delete:any', 'create:any'],
  SUPERADMIN: ['*'], // All permissions
};

export const hasPermission = (role: Role, permission: string): boolean => {
  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes('*') || rolePermissions.includes(permission);
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.role as Role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!hasPermission(req.role as Role, permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}`
      });
    }
    next();
  };
};
