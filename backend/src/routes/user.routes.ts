import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser, createUser } from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';

const router = Router();

router.get('/', authMiddleware, requireRole('ADMIN'), getAllUsers);
router.post('/', authMiddleware, requireRole('ADMIN'), createUser);
router.get('/:id', authMiddleware, getUserById);
router.put('/:id', authMiddleware, updateUser);
router.delete('/:id', authMiddleware, requireRole('ADMIN'), deleteUser);

export default router;
