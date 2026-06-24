import { Response } from 'express';
import { query } from '../config/db';
import { withOrg } from '../middleware/tenantIsolation';
import { generateSQL, needsDatabaseQuery, summarizeCases } from '../services/ai.service';
import { answerQuestion, indexDocument } from '../services/rag.service';
import { AuthRequest, AIChatBody, Case, AIResponse } from '../types';

export async function chat(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { message, conversationHistory = [] } = req.body as AIChatBody;

    if (!message || !message.trim()) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    const trimmedMessage = message.trim();

    if (await needsDatabaseQuery(trimmedMessage)) {
      try {
        const sql = await generateSQL(trimmedMessage);
        const rows = await query<Record<string, unknown>>(sql, [organization_id]);

        if (rows.length === 0) {
          const emptyResponse: AIResponse = {
            answer: 'No cases found matching your query.',
            sources: [],
            queryType: 'sql',
            data: [],
          };
          res.json(emptyResponse);
          return;
        }

        const lowerMessage = trimmedMessage.toLowerCase();
        if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
          const summary = await summarizeCases(rows as unknown as Case[]);
          const response: AIResponse = {
            answer: summary,
            sources: rows.map((r) => ({
              id: String(r.id ?? ''),
              title: String(r.title ?? r.count ?? ''),
              status: r.status ? String(r.status) : undefined,
            })),
            queryType: 'sql',
            data: rows,
          };
          res.json(response);
          return;
        }

        const count = rows.length;
        const answer =
          count === 1
            ? 'Found 1 case matching your query.'
            : `Found ${count} cases matching your query.`;

        const response: AIResponse = {
          answer,
          sources: rows.map((r) => ({
            id: String(r.id ?? ''),
            title: String(r.title ?? r.count ?? ''),
            status: r.status ? String(r.status) : undefined,
            priority: r.priority ? String(r.priority) : undefined,
          })),
          queryType: 'sql',
          data: rows,
        };
        res.json(response);
        return;
      } catch (sqlError) {
        const message = sqlError instanceof Error ? sqlError.message : 'SQL error';
        console.error('SQL generation/execution error:', message);
      }
    }

    const ragResponse = await answerQuestion(
      organization_id,
      trimmedMessage,
      conversationHistory
    );

    res.json(ragResponse);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: 'Failed to process AI chat request' });
  }
}

interface IndexDocumentBody {
  content: string;
  title?: string;
}

export async function indexDocumentHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { organization_id } = withOrg(req);
    const { content, title } = req.body as IndexDocumentBody;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Document content is required' });
      return;
    }

    await indexDocument(organization_id, content.trim(), {
      title: title || 'Untitled Document',
    });

    res.status(201).json({
      message: 'Document indexed successfully',
    });
  } catch (error) {
    console.error('Index document error:', error);
    res.status(500).json({ error: 'Failed to index document' });
  }
}
