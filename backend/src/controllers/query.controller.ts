import { Response } from 'express';
import { AuthRequest } from '../types';
import { withOrg } from '../middleware/tenantIsolation';
import { sendSuccess, sendError } from '../utils/response';
import { isValidUuid } from '../utils/uuid';
import { validateSQL } from '../utils/sql-safety';
import { generateSQLFromQuestion } from '../services/ai.service';
import { getSchema } from '../services/schema.service';
import { runQuery } from '../services/query.service';

interface GenerateBody {
  connection_id: string;
  question: string;
}

interface RunBody {
  connection_id: string;
  sql: string;
  question?: string;
}

export async function generateQueryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { connection_id, question } = req.body as GenerateBody;

    if (!connection_id || !isValidUuid(connection_id)) {
      sendError(res, 'Valid connection_id is required', 400);
      return;
    }

    if (!question || question.trim().length === 0) {
      sendError(res, 'Question is required', 400);
      return;
    }

    const schema = await getSchema(organization_id, connection_id);
    if (!schema) {
      sendError(res, 'Connection not found', 404);
      return;
    }

    if (schema.tables.length === 0) {
      sendError(res, 'No tables found in the connected database', 400);
      return;
    }

    let sql: string;
    try {
      sql = await generateSQLFromQuestion(question.trim(), schema);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate SQL';
      sendError(res, message, 400);
      return;
    }

    const safety = validateSQL(sql);
    if (!safety.safe) {
      sendError(res, safety.reason ?? 'Generated SQL failed safety check', 400);
      return;
    }

    sendSuccess(res, {
      sql,
      question: question.trim(),
      connection_id,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate SQL';
    sendError(res, message, 500);
  }
}

export async function runQueryHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { connection_id, sql, question } = req.body as RunBody;

    if (!connection_id || !isValidUuid(connection_id)) {
      sendError(res, 'Valid connection_id is required', 400);
      return;
    }

    if (!sql || sql.trim().length === 0) {
      sendError(res, 'SQL is required', 400);
      return;
    }

    const result = await runQuery(
      organization_id,
      connection_id,
      sql.trim(),
      req.user?.id,
      question
    );

    if ('error' in result) {
      const errResult = result as { error: string; detail?: string };
      sendError(
        res,
        errResult.detail ? `${errResult.error}: ${errResult.detail}` : errResult.error,
        400
      );
      return;
    }

    sendSuccess(res, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to run query';
    sendError(res, message, 500);
  }
}
