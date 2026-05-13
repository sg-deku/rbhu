import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateProvider } from '../validators/integration.validator';
import {
  listIntegrations,
  initiateConnect,
  handleCallback,
  syncNow,
  getStatus,
  deleteIntegration,
  getResources,
  getConfig,
  updateConfig,
  listActivity,
} from '../controllers/integration.controller';

const router = Router();

router.get('/', authMiddleware, listIntegrations);
router.get('/activity', authMiddleware, listActivity);
router.post('/:provider/connect', authMiddleware, validateProvider, initiateConnect);
router.get('/:provider/callback', validateProvider, handleCallback);
router.get('/:provider/status', authMiddleware, validateProvider, getStatus);
router.post('/:provider/sync', authMiddleware, validateProvider, syncNow);
router.delete('/:provider', authMiddleware, validateProvider, deleteIntegration);
router.get('/:provider/resources', authMiddleware, validateProvider, getResources);
router.get('/:provider/config', authMiddleware, validateProvider, getConfig);
router.put('/:provider/config', authMiddleware, validateProvider, updateConfig);

export default router;
