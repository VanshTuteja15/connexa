import { query } from '../config/db';
import { chat } from './ai.service';
import {
  storeEmbedding,
  searchSimilar,
  deleteEmbeddingsByMetadata,
} from './embedding.service';
import { Case, ServiceChatMessage, AIResponse } from '../types';

function buildCaseContent(caseData: Case): string {
  const parts = [
    `Title: ${caseData.title}`,
    `Type: ${caseData.type || 'N/A'}`,
    `Status: ${caseData.status}`,
    `Priority: ${caseData.priority}`,
    `Description: ${caseData.description || 'N/A'}`,
  ];

  if (caseData.data && Object.keys(caseData.data).length > 0) {
    parts.push(`Custom Data: ${JSON.stringify(caseData.data)}`);
  }

  return parts.join('\n');
}

export async function indexCase(caseData: Case): Promise<void> {
  const content = buildCaseContent(caseData);

  await deleteEmbeddingsByMetadata(
    caseData.organization_id,
    'case_id',
    caseData.id
  );

  await storeEmbedding(caseData.organization_id, content, {
    case_id: caseData.id,
    title: caseData.title,
    type: 'case',
  });
}

export async function deleteEmbedding(caseId: string, organizationId: string): Promise<void> {
  await deleteEmbeddingsByMetadata(organizationId, 'case_id', caseId);
}

export async function answerQuestion(
  organizationId: string,
  question: string,
  history: ServiceChatMessage[] = []
): Promise<AIResponse> {
  const similarDocs = await searchSimilar(organizationId, question, 5);

  const caseIds = similarDocs
    .map((doc) => doc.metadata.case_id)
    .filter((id): id is string => typeof id === 'string');

  let relevantCases: Case[] = [];

  if (caseIds.length > 0) {
    const placeholders = caseIds.map((_, i) => `$${i + 2}`).join(', ');
    relevantCases = await query<Case>(
      `SELECT id, organization_id, title, type, status, priority, description, data, created_at, updated_at
       FROM cases
       WHERE organization_id = $1 AND id IN (${placeholders}) AND status != 'deleted'`,
      [organizationId, ...caseIds]
    );
  }

  const recentCases = await query<Case>(
    `SELECT id, organization_id, title, type, status, priority, description, data, created_at, updated_at
     FROM cases
     WHERE organization_id = $1 AND status != 'deleted'
     ORDER BY updated_at DESC
     LIMIT 10`,
    [organizationId]
  );

  const contextCases = relevantCases.length > 0 ? relevantCases : recentCases;

  const contextText = contextCases
    .map(
      (c) =>
        `Case: ${c.title}
ID: ${c.id}
Type: ${c.type || 'N/A'}
Status: ${c.status}
Priority: ${c.priority}
Description: ${c.description || 'N/A'}
Created: ${c.created_at}`
    )
    .join('\n\n');

  const systemPrompt = `You are an AI assistant for a case management system. You help users understand and manage their organization's cases.

IMPORTANT RULES:
- Only discuss cases from the provided context below.
- Never invent case data that is not in the context.
- If you don't have enough information, say so clearly.
- Be concise and helpful.
- When listing cases, format them clearly.

ORGANIZATION CASE DATA:
${contextText || 'No cases found in the system yet.'}`;

  const messages: ServiceChatMessage[] = [
    ...history.slice(-6),
    { role: 'user', content: question },
  ];

  const answer = await chat(messages, systemPrompt);

  const sources = contextCases.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    priority: c.priority,
  }));

  return { answer, sources, queryType: 'rag', data: null };
}

export async function indexDocument(
  organizationId: string,
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  await storeEmbedding(organizationId, content, {
    ...metadata,
    type: 'document',
  });
}
