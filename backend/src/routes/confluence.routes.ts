import { Router } from 'express';
import { 
  initiateConfluenceAuth, 
  confluenceCallback, 
  getConfluenceSites, 
  selectConfluenceSite 
} from '../controllers/confluence.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth', authMiddleware, initiateConfluenceAuth);
router.get('/callback', confluenceCallback);
router.get('/sites', authMiddleware, getConfluenceSites);
router.post('/select-site', authMiddleware, selectConfluenceSite);

export default router;
