import { Router } from 'express';
import * as exportController from '../controllers/export.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/cases', exportController.exportCases);

export default router;
