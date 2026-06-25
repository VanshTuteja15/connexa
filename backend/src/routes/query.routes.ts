import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import * as queryController from '../controllers/query.controller';
import * as historyController from '../controllers/history.controller';

const router = Router();

const queryRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many query requests. Try again in a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);

router.post('/generate', queryRateLimit, queryController.generateQueryHandler);
router.post('/run', queryRateLimit, queryController.runQueryHandler);
router.get('/history', historyController.listHistoryHandler);

export default router;
