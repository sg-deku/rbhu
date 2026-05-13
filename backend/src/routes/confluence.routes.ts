import { Router } from 'express';
import { 
  initiateConfluenceAuth, 
  confluenceCallback, 
  getConfluenceSites, 
  selectConfluenceSite,
  getSpaces,
  getPageTree,
  getBlogPosts
} from '../controllers/confluence.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth', authMiddleware, initiateConfluenceAuth);
router.get('/callback', confluenceCallback);
router.get('/sites', authMiddleware, getConfluenceSites);
router.post('/select-site', authMiddleware, selectConfluenceSite);
router.get('/spaces', authMiddleware, getSpaces);
router.get('/spaces/:spaceId/pages', authMiddleware, getPageTree);
router.get('/spaces/:spaceId/blogposts', authMiddleware, getBlogPosts);

export default router;
