import { Router } from 'express';
import * as aiController from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/chat', aiController.chat);
router.post('/index', aiController.indexDocumentHandler);

export default router;
