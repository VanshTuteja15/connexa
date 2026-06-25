import { Response } from 'express';
import { AuthRequest } from '../types';
import { withOrg } from '../middleware/tenantIsolation';
import { sendSuccess, sendError } from '../utils/response';
import { isValidUuid } from '../utils/uuid';
import {
  testConnection,
  createConnection,
  listConnections,
  updateConnection,
  deleteConnection,
} from '../services/connection.service';
import { ConnectionInput, ConnectionTestInput } from '../models/connection.model';

export async function testConnectionHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const input = req.body as ConnectionTestInput;
    const result = await testConnection(input);
    if (result.ok) {
      sendSuccess(res, { connected: true });
    } else {
      sendError(res, result.error ?? 'Connection failed', 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection test failed';
    sendError(res, message, 500);
  }
}

export async function saveConnection(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const input = req.body as ConnectionInput;

    const testResult = await testConnection({
      host: input.host,
      port: input.port ?? 5432,
      database: input.database,
      username: input.username,
      password: input.password ?? '',
      ssl: input.ssl ?? false,
    });

    if (!testResult.ok) {
      sendError(res, testResult.error ?? 'Connection test failed before save', 400);
      return;
    }

    const connection = await createConnection(organization_id, input);
    sendSuccess(res, connection, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save connection';
    sendError(res, message, 400);
  }
}

export async function listConnectionsHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const connections = await listConnections(organization_id);
    sendSuccess(res, connections);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list connections';
    sendError(res, message, 500);
  }
}

export async function updateConnectionHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { id } = req.params;

    if (!isValidUuid(id)) {
      sendError(res, 'Invalid connection ID', 400);
      return;
    }

    const updated = await updateConnection(organization_id, id, req.body as Partial<ConnectionInput>);
    if (!updated) {
      sendError(res, 'Connection not found', 404);
      return;
    }
    sendSuccess(res, updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update connection';
    sendError(res, message, 400);
  }
}

export async function deleteConnectionHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { id } = req.params;

    if (!isValidUuid(id)) {
      sendError(res, 'Invalid connection ID', 400);
      return;
    }

    const deleted = await deleteConnection(organization_id, id);
    if (!deleted) {
      sendError(res, 'Connection not found', 404);
      return;
    }
    sendSuccess(res, { deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete connection';
    sendError(res, message, 500);
  }
}
