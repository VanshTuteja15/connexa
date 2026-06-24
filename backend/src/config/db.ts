import pg, { QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('PostgreSQL pool: new client connected');
});

pool.on('error', (err: Error) => {
  console.error('PostgreSQL pool error:', err.message);
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log('Query executed', { duration: `${duration}ms`, rows: result.rowCount });
    }
    return result.rows as T[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';
    console.error('Database query error:', message);
    throw error;
  }
}

export { pool };
