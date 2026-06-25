import { Response } from 'express';
import { AuthRequest } from '../types';
import { withOrg } from '../middleware/tenantIsolation';
import { sendSuccess, sendError } from '../utils/response';
import { isValidUuid } from '../utils/uuid';
import { getSchema } from '../services/schema.service';

export async function getSchemaHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { connectionId } = req.params;

    if (!isValidUuid(connectionId)) {
      sendError(res, 'Invalid connection ID', 400);
      return;
    }

    const schema = await getSchema(organization_id, connectionId);
    if (!schema) {
      sendError(res, 'Connection not found or schema unavailable', 404);
      return;
    }

    sendSuccess(res, schema);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read schema';
    sendError(res, message, 500);
  }
}
