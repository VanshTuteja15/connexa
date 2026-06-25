import { Response } from 'express';
import { query } from '../config/db';
import { withOrg } from '../middleware/tenantIsolation';
import { sendSuccess, sendError } from '../utils/response';
import { indexCase, deleteEmbedding } from '../services/rag.service';
import {
  AuthRequest,
  Case,
  CaseRow,
  CaseStats,
  CreateCaseBody,
  UpdateCaseBody,
  CountRow,
  StatusCountRow,
  TypeCountRow,
  PriorityCountRow,
  User,
} from '../types';

async function logAudit(
  organizationId: string,
  userId: string,
  action: string,
  tableName: string,
  recordId: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): Promise<void> {
  await query(
    `INSERT INTO audit_logs (organization_id, user_id, action, table_name, record_id, old_data, new_data)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      organizationId,
      userId,
      action,
      tableName,
      recordId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
    ]
  );
}

function getQueryString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function getAllCases(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const status = getQueryString(req.query.status as string | string[] | undefined);
    const type = getQueryString(req.query.type as string | string[] | undefined);
    const priority = getQueryString(req.query.priority as string | string[] | undefined);
    const search = getQueryString(req.query.search as string | string[] | undefined);
    const sortBy = getQueryString(req.query.sortBy as string | string[] | undefined) || 'created_at';
    const sortOrder = getQueryString(req.query.sortOrder as string | string[] | undefined) || 'desc';
    const page = getQueryString(req.query.page as string | string[] | undefined) || '1';
    const limit = getQueryString(req.query.limit as string | string[] | undefined) || '25';

    const allowedSortColumns = ['title', 'type', 'status', 'priority', 'created_at', 'updated_at'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions = ['c.organization_id = $1', "c.status != 'deleted'"];
    const params: unknown[] = [organization_id];
    let paramIndex = 2;

    if (status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(status);
      paramIndex += 1;
    }

    if (type) {
      conditions.push(`c.type = $${paramIndex}`);
      params.push(type);
      paramIndex += 1;
    }

    if (priority) {
      conditions.push(`c.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex += 1;
    }

    if (search) {
      conditions.push(`(c.title ILIKE $${paramIndex} OR c.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');
    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const pageLimit = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) AS total FROM cases c WHERE ${whereClause}`,
      params
    );

    const cases = await query<CaseRow>(
      `SELECT c.id, c.organization_id, c.title, c.type, c.status, c.priority, c.assigned_to,
              c.description, c.data, c.created_at, c.updated_at,
              u.name AS assigned_to_name
       FROM cases c
       LEFT JOIN users u ON u.id = c.assigned_to AND u.organization_id = c.organization_id
       WHERE ${whereClause}
       ORDER BY c.${sortColumn} ${order}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, pageLimit, offset]
    );

    const total = parseInt(countResult[0].total, 10);

    sendSuccess(res, {
      cases,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error('GetAllCases error:', error);
    sendError(res, 'Failed to fetch cases', 500);
  }
}

export async function getCaseById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { id } = req.params;

    const cases = await query<CaseRow>(
      `SELECT c.id, c.organization_id, c.title, c.type, c.status, c.priority, c.assigned_to,
              c.description, c.data, c.created_at, c.updated_at,
              u.name AS assigned_to_name
       FROM cases c
       LEFT JOIN users u ON u.id = c.assigned_to AND u.organization_id = c.organization_id
       WHERE c.id = $1 AND c.organization_id = $2 AND c.status != 'deleted'`,
      [id, organization_id]
    );

    if (cases.length === 0) {
      sendError(res, 'Case not found', 404);
      return;
    }

    sendSuccess(res, { case: cases[0] });
  } catch (error) {
    console.error('GetCaseById error:', error);
    sendError(res, 'Failed to fetch case', 500);
  }
}

export async function createCase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { title, type, status, priority, assigned_to, description, data } =
      req.body as CreateCaseBody;

    if (!title) {
      sendError(res, 'Title is required', 400);
      return;
    }

    if (assigned_to) {
      const assigneeCheck = await query<{ id: string }>(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [assigned_to, organization_id]
      );
      if (assigneeCheck.length === 0) {
        sendError(res, 'Assigned user not found in organization', 400);
        return;
      }
    }

    const newCases = await query<Case>(
      `INSERT INTO cases (organization_id, title, type, status, priority, assigned_to, description, data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organization_id,
        title,
        type || '',
        status || 'open',
        priority || 'medium',
        assigned_to || null,
        description || null,
        JSON.stringify(data || {}),
      ]
    );

    const newCase = newCases[0];

    await logAudit(organization_id, req.user.id, 'CREATE', 'cases', newCase.id, null, newCase as unknown as Record<string, unknown>);

    try {
      await indexCase(newCase);
    } catch (indexError) {
      const message = indexError instanceof Error ? indexError.message : 'Unknown error';
      console.error('Failed to index case for RAG:', message);
    }

    sendSuccess(res, { case: newCase }, 201);
  } catch (error) {
    console.error('CreateCase error:', error);
    sendError(res, 'Failed to create case', 500);
  }
}

export async function updateCase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;
    const { title, type, status, priority, assigned_to, description, data } =
      req.body as UpdateCaseBody;

    const existing = await query<Case>(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND status != $3',
      [id, organization_id, 'deleted']
    );

    if (existing.length === 0) {
      sendError(res, 'Case not found', 404);
      return;
    }

    const oldCase = existing[0];

    if (assigned_to) {
      const assigneeCheck = await query<{ id: string }>(
        'SELECT id FROM users WHERE id = $1 AND organization_id = $2',
        [assigned_to, organization_id]
      );
      if (assigneeCheck.length === 0) {
        sendError(res, 'Assigned user not found in organization', 400);
        return;
      }
    }

    const updatedCases = await query<Case>(
      `UPDATE cases
       SET title = COALESCE($3, title),
           type = COALESCE($4, type),
           status = COALESCE($5, status),
           priority = COALESCE($6, priority),
           assigned_to = COALESCE($7, assigned_to),
           description = COALESCE($8, description),
           data = COALESCE($9, data),
           updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [
        id,
        organization_id,
        title,
        type,
        status,
        priority,
        assigned_to,
        description,
        data !== undefined ? JSON.stringify(data) : null,
      ]
    );

    const updatedCase = updatedCases[0];

    await logAudit(
      organization_id,
      req.user.id,
      'UPDATE',
      'cases',
      id,
      oldCase as unknown as Record<string, unknown>,
      updatedCase as unknown as Record<string, unknown>
    );

    try {
      await indexCase(updatedCase);
    } catch (indexError) {
      const message = indexError instanceof Error ? indexError.message : 'Unknown error';
      console.error('Failed to re-index case for RAG:', message);
    }

    sendSuccess(res, { case: updatedCase });
  } catch (error) {
    console.error('UpdateCase error:', error);
    sendError(res, 'Failed to update case', 500);
  }
}

export async function deleteCase(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { id } = req.params;

    const existing = await query<Case>(
      'SELECT * FROM cases WHERE id = $1 AND organization_id = $2 AND status != $3',
      [id, organization_id, 'deleted']
    );

    if (existing.length === 0) {
      sendError(res, 'Case not found', 404);
      return;
    }

    const oldCase = existing[0];

    const deletedCases = await query<Case>(
      `UPDATE cases SET status = 'deleted', updated_at = NOW()
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organization_id]
    );

    await logAudit(
      organization_id,
      req.user.id,
      'DELETE',
      'cases',
      id,
      oldCase as unknown as Record<string, unknown>,
      deletedCases[0] as unknown as Record<string, unknown>
    );

    try {
      await deleteEmbedding(id, organization_id);
    } catch (indexError) {
      const message = indexError instanceof Error ? indexError.message : 'Unknown error';
      console.error('Failed to delete case embedding:', message);
    }

    sendSuccess(res, { message: 'Case deleted successfully' });
  } catch (error) {
    console.error('DeleteCase error:', error);
    sendError(res, 'Failed to delete case', 500);
  }
}

export async function getCaseStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);

    const statusResult = await query<StatusCountRow>(
      `SELECT status, COUNT(*) AS count
       FROM cases
       WHERE organization_id = $1 AND status != 'deleted'
       GROUP BY status`,
      [organization_id]
    );

    const typeResult = await query<TypeCountRow>(
      `SELECT type, COUNT(*) AS count
       FROM cases
       WHERE organization_id = $1 AND status != 'deleted' AND type IS NOT NULL
       GROUP BY type`,
      [organization_id]
    );

    const priorityResult = await query<PriorityCountRow>(
      `SELECT priority, COUNT(*) AS count
       FROM cases
       WHERE organization_id = $1 AND status != 'deleted'
       GROUP BY priority`,
      [organization_id]
    );

    const totalResult = await query<CountRow>(
      `SELECT COUNT(*) AS total
       FROM cases
       WHERE organization_id = $1 AND status != 'deleted'`,
      [organization_id]
    );

    const byStatus: Record<string, number> = {};
    statusResult.forEach((row) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    const by_type: Record<string, number> = {};
    typeResult.forEach((row) => {
      if (row.type) by_type[row.type] = parseInt(row.count, 10);
    });

    const by_priority: Record<string, number> = {};
    priorityResult.forEach((row) => {
      by_priority[row.priority] = parseInt(row.count, 10);
    });

    const stats: CaseStats = {
      total: parseInt(totalResult[0].total, 10),
      open: byStatus.open || 0,
      in_progress: byStatus.in_progress || 0,
      resolved: byStatus.resolved || 0,
      by_type,
      by_priority,
    };

    sendSuccess(res, stats);
  } catch (error) {
    console.error('GetCaseStats error:', error);
    sendError(res, 'Failed to fetch case statistics', 500);
  }
}

export async function getOrgUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);

    const users = await query<User>(
      `SELECT id, name, email, role, organization_id, created_at
       FROM users
       WHERE organization_id = $1
       ORDER BY name ASC`,
      [organization_id]
    );

    sendSuccess(res, { users });
  } catch (error) {
    console.error('GetOrgUsers error:', error);
    sendError(res, 'Failed to fetch organization users', 500);
  }
}
