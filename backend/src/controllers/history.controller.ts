import { Response } from 'express';
import { AuthRequest } from '../types';
import { withOrg } from '../middleware/tenantIsolation';
import { sendSuccess, sendError } from '../utils/response';
import { isValidUuid } from '../utils/uuid';
import {
  listQueryHistory,
  getQueryHistoryById,
  deleteQueryHistory,
  deleteAllQueryHistory,
} from '../services/history.service';

function getQueryParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function listHistoryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const page = parseInt(getQueryParam(req.query.page as string) ?? '1', 10);
    const limit = parseInt(getQueryParam(req.query.limit as string) ?? '20', 10);
    const connectionId = getQueryParam(req.query.connection_id as string);
    const from = getQueryParam(req.query.from as string);
    const to = getQueryParam(req.query.to as string);
    const status = getQueryParam(req.query.status as string);

    if (connectionId && !isValidUuid(connectionId)) {
      sendError(res, 'Invalid connection_id filter', 400);
      return;
    }

    const result = await listQueryHistory({
      organizationId: organization_id,
      page,
      limit,
      connectionId,
      from,
      to,
      status,
    });

    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list history';
    sendError(res, message, 500);
  }
}

export async function getHistoryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { id } = req.params;

    if (!isValidUuid(id)) {
      sendError(res, 'Invalid history ID', 400);
      return;
    }

    const record = await getQueryHistoryById(organization_id, id);
    if (!record) {
      sendError(res, 'History record not found', 404);
      return;
    }

    sendSuccess(res, record);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get history';
    sendError(res, message, 500);
  }
}

export async function deleteHistoryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { id } = req.params;

    if (!isValidUuid(id)) {
      sendError(res, 'Invalid history ID', 400);
      return;
    }

    const deleted = await deleteQueryHistory(organization_id, id);
    if (!deleted) {
      sendError(res, 'History record not found', 404);
      return;
    }

    sendSuccess(res, { deleted: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete history';
    sendError(res, message, 500);
  }
}

export async function deleteAllHistoryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);

    if (req.headers['x-confirm'] !== 'delete-all') {
      sendError(res, 'Confirmation required. Set header X-Confirm: delete-all', 400);
      return;
    }

    const count = await deleteAllQueryHistory(organization_id);
    sendSuccess(res, { deleted_count: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete history';
    sendError(res, message, 500);
  }
}
