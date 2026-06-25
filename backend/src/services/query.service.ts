import { query } from '../config/db';
import { validateSQL } from '../utils/sql-safety';
import { getConnectionConfig, createUserPool } from './connection.service';

export interface QueryRunResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
  truncated: boolean;
}

export interface QueryRunError {
  error: string;
  detail?: string;
}

const MAX_ROWS = 1000;

export async function runQuery(
  organizationId: string,
  connectionId: string,
  sql: string,
  userId?: string,
  question?: string
): Promise<QueryRunResult | QueryRunError> {
  const safety = validateSQL(sql);
  if (!safety.safe) {
    await logQueryHistory({
      organizationId,
      userId,
      connectionId,
      question,
      sql,
      status: 'error',
      errorMessage: safety.reason,
    });
    return { error: safety.reason ?? 'Unsafe query' };
  }

  const config = await getConnectionConfig(organizationId, connectionId);
  if (!config) {
    return { error: 'Connection not found' };
  }

  const pool = createUserPool(config, 30000);
  const start = Date.now();

  const wrappedSql = `SELECT * FROM (${sql.replace(/;+\s*$/, '')}) AS __connexa_result LIMIT ${MAX_ROWS + 1}`;

  try {
    const result = await pool.query(wrappedSql);
    const executionTime = Date.now() - start;

    const truncated = result.rows.length > MAX_ROWS;
    const rows = truncated ? result.rows.slice(0, MAX_ROWS) : result.rows;
    const columns = result.fields.map((f) => f.name);

    const serializedRows = rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const key of Object.keys(row)) {
        const val = row[key];
        if (val instanceof Date) {
          record[key] = val.toISOString();
        } else {
          record[key] = val;
        }
      }
      return record;
    });

    await logQueryHistory({
      organizationId,
      userId,
      connectionId,
      question,
      sql,
      status: 'success',
      rowCount: serializedRows.length,
      executionTimeMs: executionTime,
    });

    console.log(
      `[QUERY] org=${organizationId} conn=${connectionId} time=${executionTime}ms sql=${sql.substring(0, 200)}`
    );

    return {
      columns,
      rows: serializedRows,
      row_count: serializedRows.length,
      execution_time_ms: executionTime,
      truncated,
    };
  } catch (err) {
    const executionTime = Date.now() - start;
    const pgError = err as { message?: string; code?: string };

    let errorMessage = 'Query execution failed';
    let detail: string | undefined;

    if (pgError.code === '57014' || pgError.message?.includes('timeout')) {
      errorMessage = 'Query timed out after 30 seconds';
    } else if (pgError.message?.includes('connect') || pgError.message?.includes('ECONNREFUSED')) {
      errorMessage = 'Could not connect to database';
    } else if (pgError.message) {
      errorMessage = 'SQL syntax error';
      detail = pgError.message;
    }

    await logQueryHistory({
      organizationId,
      userId,
      connectionId,
      question,
      sql,
      status: 'error',
      errorMessage: detail ?? errorMessage,
      executionTimeMs: executionTime,
    });

    return { error: errorMessage, detail };
  } finally {
    await pool.end();
  }
}

interface LogParams {
  organizationId: string;
  userId?: string;
  connectionId: string;
  question?: string;
  sql: string;
  status: 'success' | 'error';
  rowCount?: number;
  executionTimeMs?: number;
  errorMessage?: string;
}

async function logQueryHistory(params: LogParams): Promise<void> {
  await query(
    `INSERT INTO query_history
       (organization_id, user_id, connection_id, question, generated_sql,
        row_count, execution_time_ms, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      params.organizationId,
      params.userId ?? null,
      params.connectionId,
      params.question ?? null,
      params.sql,
      params.rowCount ?? null,
      params.executionTimeMs ?? null,
      params.status,
      params.errorMessage ?? null,
    ]
  );
}
