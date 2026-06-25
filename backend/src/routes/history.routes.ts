import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as historyController from '../controllers/history.controller';

const router = Router();

router.use(authenticate);

router.get('/', historyController.listHistoryHandler);
router.delete('/', historyController.deleteAllHistoryHandler);
router.get('/:id', historyController.getHistoryHandler);
router.delete('/:id', historyController.deleteHistoryHandler);

export default router;
