import { Router } from 'express';
import * as casesController from '../controllers/cases.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', casesController.getCaseStats);
router.get('/users', casesController.getOrgUsers);
router.get('/', casesController.getAllCases);
router.get('/:id', casesController.getCaseById);
router.post('/', casesController.createCase);
router.put('/:id', casesController.updateCase);
router.delete('/:id', casesController.deleteCase);

export default router;
