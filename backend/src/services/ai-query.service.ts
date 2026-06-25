import { Ollama } from 'ollama';
import { getSchema, formatSchemaForPrompt } from './schema.service';

const ollama = new Ollama({
  host: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
});

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3';

export interface GenerateSQLResult {
  sql: string;
  question: string;
  connection_id: string;
  generated_at: string;
}

export async function generateSQLFromQuestion(
  organizationId: string,
  connectionId: string,
  question: string
): Promise<GenerateSQLResult | { error: string }> {
  const schema = await getSchema(organizationId, connectionId);
  if (!schema) {
    return { error: 'Connection not found' };
  }

  if (schema.tables.length === 0) {
    return { error: 'No tables found in the connected database' };
  }

  const schemaText = formatSchemaForPrompt(schema);

  const systemPrompt = `You are a PostgreSQL expert. Given the database schema below, write a single valid SELECT query that answers the user's question.

Rules:
- Output ONLY the SQL query, no explanation, no markdown, no backticks
- Use only SELECT statements
- Never use DELETE, DROP, UPDATE, INSERT, ALTER, CREATE, or TRUNCATE
- Always use table aliases for clarity
- Limit results to 1000 rows unless the user asks for all
- If the question cannot be answered with the given schema, output: CANNOT_ANSWER

Schema:
${schemaText}`;

  const response = await ollama.chat({
    model: DEFAULT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    stream: false,
  });

  let sql = response.message.content.trim();
  sql = sql.replace(/```sql/gi, '').replace(/```/g, '').trim();

  if (sql === 'CANNOT_ANSWER' || sql.includes('CANNOT_ANSWER')) {
    return { error: 'This question cannot be answered with the available schema' };
  }

  return {
    sql,
    question,
    connection_id: connectionId,
    generated_at: new Date().toISOString(),
  };
}
