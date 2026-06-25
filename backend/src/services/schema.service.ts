import pg from 'pg';
import { getConnectionConfig, createUserPool } from './connection.service';

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  is_primary_key: boolean;
}

export interface SchemaForeignKey {
  column: string;
  references_table: string;
  references_column: string;
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
  foreign_keys: SchemaForeignKey[];
  row_count_estimate: number;
}

export interface SchemaResponse {
  connection_id: string;
  database: string;
  tables: SchemaTable[];
}

interface CacheEntry {
  data: SchemaResponse;
  expiresAt: number;
}

const schemaCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateSchemaCache(connectionId: string): void {
  schemaCache.delete(connectionId);
}

export async function getSchema(
  organizationId: string,
  connectionId: string
): Promise<SchemaResponse | null> {
  const cached = schemaCache.get(connectionId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const config = await getConnectionConfig(organizationId, connectionId);
  if (!config) return null;

  const pool = createUserPool(config, 15000);

  try {
    const tablesResult = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name`
    );

    const tables: SchemaTable[] = [];

    for (const { table_name } of tablesResult.rows) {
      const columnsResult = await pool.query<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table_name]
      );

      const pkResult = await pool.query<{ column_name: string }>(
        `SELECT kcu.column_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = 'public'
           AND tc.table_name = $1`,
        [table_name]
      );

      const pkColumns = new Set(pkResult.rows.map((r) => r.column_name));

      const fkResult = await pool.query<{
        column_name: string;
        foreign_table: string;
        foreign_column: string;
      }>(
        `SELECT
           kcu.column_name,
           ccu.table_name AS foreign_table,
           ccu.column_name AS foreign_column
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
           AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON ccu.constraint_name = tc.constraint_name
           AND ccu.table_schema = tc.table_schema
         WHERE tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_schema = 'public'
           AND tc.table_name = $1`,
        [table_name]
      );

      let rowCountEstimate = 0;
      try {
        const countResult = await pool.query<{ estimate: string }>(
          `SELECT reltuples::bigint AS estimate
           FROM pg_class
           WHERE oid = $1::regclass`,
          [`public.${table_name}`]
        );
        rowCountEstimate = parseInt(countResult.rows[0]?.estimate ?? '0', 10);
      } catch {
        rowCountEstimate = 0;
      }

      tables.push({
        name: table_name,
        columns: columnsResult.rows.map((col) => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          is_primary_key: pkColumns.has(col.column_name),
        })),
        foreign_keys: fkResult.rows.map((fk) => ({
          column: fk.column_name,
          references_table: fk.foreign_table,
          references_column: fk.foreign_column,
        })),
        row_count_estimate: rowCountEstimate,
      });
    }

    const response: SchemaResponse = {
      connection_id: connectionId,
      database: config.database,
      tables,
    };

    schemaCache.set(connectionId, {
      data: response,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return response;
  } finally {
    await pool.end();
  }
}

export function formatSchemaForPrompt(schema: SchemaResponse): string {
  return formatSchemaForAI(schema);
}

export function formatSchemaForAI(schema: SchemaResponse): string {
  return schema.tables
    .map((table) => {
      const colParts = table.columns.map((col) => {
        let part = `${col.name} ${col.type.toUpperCase()}`;
        if (col.is_primary_key) part += ' PK';
        const fk = table.foreign_keys.find((f) => f.column === col.name);
        if (fk) part += ` FK→${fk.references_table}.${fk.references_column}`;
        return part;
      });
      return `Table: ${table.name} (${colParts.join(', ')})`;
    })
    .join('\n');
}
