const BLOCKED_KEYWORDS = [
  'DELETE', 'DROP', 'UPDATE', 'INSERT',
  'ALTER', 'CREATE', 'TRUNCATE', 'REPLACE',
  'MERGE', 'EXEC', 'EXECUTE', 'GRANT', 'REVOKE',
  'CALL', 'COPY', 'VACUUM', 'REINDEX',
];

export function validateSQL(sql: string): { safe: boolean; reason?: string } {
  const normalized = sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim()
    .toUpperCase();

  if (!normalized.startsWith('SELECT')) {
    return { safe: false, reason: 'Only SELECT queries are allowed.' };
  }

  for (const keyword of BLOCKED_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`);
    if (regex.test(normalized)) {
      return { safe: false, reason: `Query contains blocked keyword: ${keyword}` };
    }
  }

  return { safe: true };
}
