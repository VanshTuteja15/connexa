import { query } from '../config/db';

export interface QueryHistoryRecord {
  id: string;
  organization_id: string;
  user_id: string | null;
  connection_id: string;
  connection_name?: string;
  question: string | null;
  generated_sql: string;
  row_count: number | null;
  execution_time_ms: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface HistoryListParams {
  organizationId: string;
  page?: number;
  limit?: number;
  connectionId?: string;
  from?: string;
  to?: string;
}

export async function listQueryHistory(
  params: HistoryListParams
): Promise<{ records: QueryHistoryRecord[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const offset = (page - 1) * limit;

  const conditions = ['qh.organization_id = $1'];
  const values: unknown[] = [params.organizationId];
  let idx = 2;

  if (params.connectionId) {
    conditions.push(`qh.connection_id = $${idx}`);
    values.push(params.connectionId);
    idx += 1;
  }

  if (params.from) {
    conditions.push(`qh.created_at >= $${idx}`);
    values.push(params.from);
    idx += 1;
  }

  if (params.to) {
    conditions.push(`qh.created_at <= $${idx}`);
    values.push(params.to);
    idx += 1;
  }

  const where = conditions.join(' AND ');

  const countRows = await query<{ total: string }>(
    `SELECT COUNT(*) AS total FROM query_history qh WHERE ${where}`,
    values
  );

  const records = await query<QueryHistoryRecord>(
    `SELECT qh.id, qh.organization_id, qh.user_id, qh.connection_id,
            dc.name AS connection_name,
            qh.question, qh.generated_sql, qh.row_count, qh.execution_time_ms,
            qh.status, qh.error_message, qh.created_at
     FROM query_history qh
     LEFT JOIN database_connections dc ON dc.id = qh.connection_id
     WHERE ${where}
     ORDER BY qh.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    records,
    total: parseInt(countRows[0]?.total ?? '0', 10),
    page,
    limit,
  };
}

export async function getQueryHistoryById(
  organizationId: string,
  historyId: string
): Promise<QueryHistoryRecord | null> {
  const rows = await query<QueryHistoryRecord>(
    `SELECT qh.id, qh.organization_id, qh.user_id, qh.connection_id,
            dc.name AS connection_name,
            qh.question, qh.generated_sql, qh.row_count, qh.execution_time_ms,
            qh.status, qh.error_message, qh.created_at
     FROM query_history qh
     LEFT JOIN database_connections dc ON dc.id = qh.connection_id
     WHERE qh.id = $1 AND qh.organization_id = $2`,
    [historyId, organizationId]
  );
  return rows[0] ?? null;
}

export async function deleteQueryHistory(
  organizationId: string,
  historyId: string
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM query_history
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [historyId, organizationId]
  );
  return rows.length > 0;
}

export async function deleteAllQueryHistory(organizationId: string): Promise<number> {
  const rows = await query<{ id: string }>(
    `DELETE FROM query_history
     WHERE organization_id = $1
     RETURNING id`,
    [organizationId]
  );
  return rows.length;
}
