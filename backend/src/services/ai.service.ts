import { Ollama } from 'ollama';
import { Case, ServiceChatMessage } from '../types';
import { SchemaResponse, formatSchemaForAI } from './schema.service';
const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

export const CASES_SCHEMA = `
Table: cases
Columns:
  id UUID
  organization_id UUID
  title VARCHAR(255)
  type VARCHAR(100)
  status VARCHAR(50) - values: open, in_progress, resolved, deleted
  priority VARCHAR(50) - values: low, medium, high
  assigned_to UUID
  description TEXT
  data JSONB
  created_at TIMESTAMP
  updated_at TIMESTAMP
`;

export async function chat(messages: ServiceChatMessage[], systemPrompt: string): Promise<string> {
  const formattedMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: m.content,
    })),
  ];

  const response = await ollama.chat({
    model: 'llama3',
    messages: formattedMessages,
    stream: false,
  });

  return response.message.content;
}

export async function generateSQLFromQuestion(question: string, schema: SchemaResponse): Promise<string> {
  const schemaText = formatSchemaForAI(schema);
  const model = process.env.OLLAMA_MODEL || 'llama3';

  const systemPrompt = `You are a PostgreSQL expert. Given the database schema, write a single valid SELECT query.

STRICT RULES:
1. Output ONLY the raw SQL query — no explanation, no markdown, no backticks
2. Only SELECT statements — never DELETE, DROP, UPDATE, INSERT, ALTER, CREATE, TRUNCATE
3. Always use table aliases for clarity
4. Add LIMIT 500 unless user asks for a count
5. If the question cannot be answered with this schema, output exactly: CANNOT_ANSWER

Schema:
${schemaText}`;

  const response = await ollama.chat({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    stream: false,
  });

  let sql = response.message.content.trim();
  sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

  if (sql === 'CANNOT_ANSWER' || sql.includes('CANNOT_ANSWER')) {
    throw new Error('This question cannot be answered with the available schema');
  }

  return sql;
}

export async function generateSQL(naturalLanguage: string, schema: string = CASES_SCHEMA): Promise<string> {
  const systemPrompt = `You are a SQL query generator for a case management system.
Given a natural language question, generate a safe PostgreSQL SELECT query.

RULES (STRICT):
1. ONLY generate SELECT statements. Never DROP, DELETE, UPDATE, INSERT, ALTER, or TRUNCATE.
2. ALWAYS include WHERE organization_id = $1 in the query.
3. Use parameterized queries: organization_id is always $1, additional params start at $2.
4. Only query the cases table and join users table if needed for assigned_to names.
5. Return ONLY the raw SQL query, no explanation, no markdown, no backticks.
6. Limit results to 100 rows unless user asks for a count (use COUNT(*)).
7. Never access tables other than cases and users.

Schema:
${schema}`;

  const response = await chat([{ role: 'user', content: naturalLanguage }], systemPrompt);

  let sql = response.trim();
  sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

  const upperSql = sql.toUpperCase();
  const forbidden = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'GRANT'];
  for (const keyword of forbidden) {
    if (upperSql.includes(keyword)) {
      throw new Error('Generated query contains forbidden operations');
    }
  }

  if (!upperSql.startsWith('SELECT')) {
    throw new Error('Generated query must be a SELECT statement');
  }

  if (!sql.includes('organization_id')) {
    throw new Error('Generated query must filter by organization_id');
  }

  return sql;
}

export async function summarizeCases(cases: Case[]): Promise<string> {
  if (!cases || cases.length === 0) {
    return 'No cases to summarize.';
  }

  const casesText = cases
    .map(
      (c) =>
        `- ${c.title} (${c.status}, ${c.priority} priority, type: ${c.type || 'N/A'})`
    )
    .join('\n');

  const systemPrompt =
    'You are a case management assistant. Summarize the following cases in clear, concise plain English. Highlight key patterns, urgent items, and status distribution.';

  return chat(
    [{ role: 'user', content: `Summarize these cases:\n${casesText}` }],
    systemPrompt
  );
}

export async function needsDatabaseQuery(message: string): Promise<boolean> {
  const lowerMessage = message.toLowerCase();
  const sqlKeywords = [
    'how many',
    'count',
    'list all',
    'show all',
    'show me',
    'find',
    'search',
    'filter',
    'cases where',
    'cases with',
    'open cases',
    'closed cases',
    'resolved cases',
    'high priority',
    'low priority',
    'assigned to',
    'created this week',
    'created today',
    'status',
    'type',
  ];

  return sqlKeywords.some((kw) => lowerMessage.includes(kw));
}
