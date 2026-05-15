import { Router } from 'express';
import { 
  initiateJiraAuth, 
  jiraCallback, 
  getProjects, 
  getIssues, 
  getComments 
} from '../controllers/jira.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/auth', authMiddleware, initiateJiraAuth);
router.get('/callback', jiraCallback);

router.get('/projects', authMiddleware, getProjects);
router.get('/issues', authMiddleware, getIssues);
router.get('/issues/:issueIdOrKey/comments', authMiddleware, getComments);

export default router;
