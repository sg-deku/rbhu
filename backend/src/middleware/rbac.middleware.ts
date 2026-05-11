import { Request, Response, NextFunction } from 'express';

type Role = 'user' | 'admin' | 'moderator' | 'superadmin';

// Permission map
const permissions: Record<Role, string[]> = {
  user: ['read:own', 'update:own', 'delete:own'],
  moderator: ['read:own', 'read:any', 'update:own', 'update:any', 'delete:own'],
  admin: ['read:own', 'read:any', 'update:own', 'update:any', 'delete:own', 'delete:any', 'create:any'],
  superadmin: ['*'], // All permissions
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
