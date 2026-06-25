import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as schemaController from '../controllers/schema.controller';

const router = Router();

router.use(authenticate);

router.get('/:connectionId', schemaController.getSchemaHandler);

export default router;
