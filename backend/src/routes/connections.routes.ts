import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as connectionsController from '../controllers/connections.controller';

const router = Router();

router.use(authenticate);

router.post('/test', connectionsController.testConnectionHandler);
router.post('/save', connectionsController.saveConnection);
router.get('/', connectionsController.listConnectionsHandler);
router.put('/:id', connectionsController.updateConnectionHandler);
router.delete('/:id', connectionsController.deleteConnectionHandler);

export default router;
