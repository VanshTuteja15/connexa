import pg from 'pg';
import validator from 'validator';
import { query } from '../config/db';
import { encryptPassword, decryptPassword } from '../utils/encryption';
import {
  ConnectionInput,
  ConnectionPublic,
  ConnectionTestInput,
  DatabaseConnection,
} from '../models/connection.model';

const { Pool } = pg;

const TEST_TIMEOUT_MS = 5000;

export function validateConnectionInput(
  input: Partial<ConnectionInput>,
  requirePassword: boolean
): { valid: boolean; error?: string } {
  if (!input.name || !validator.isLength(input.name.trim(), { min: 1, max: 100 })) {
    return { valid: false, error: 'Connection name is required (max 100 characters)' };
  }
  if (!input.host || !validator.isLength(input.host.trim(), { min: 1 })) {
    return { valid: false, error: 'Host is required' };
  }
  const port = input.port ?? 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { valid: false, error: 'Port must be an integer between 1 and 65535' };
  }
  if (!input.database || !validator.isLength(input.database.trim(), { min: 1 })) {
    return { valid: false, error: 'Database name is required' };
  }
  if (!input.username || !validator.isLength(input.username.trim(), { min: 1 })) {
    return { valid: false, error: 'Username is required' };
  }
  if (requirePassword && (!input.password || input.password.length === 0)) {
    return { valid: false, error: 'Password is required' };
  }
  return { valid: true };
}

function toPublic(conn: DatabaseConnection): ConnectionPublic {
  return {
    id: conn.id,
    organization_id: conn.organization_id,
    name: conn.name,
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    ssl: conn.ssl,
    has_password: true,
    created_at: new Date(conn.created_at).toISOString(),
    updated_at: new Date(conn.updated_at).toISOString(),
  };
}

export async function testConnection(config: ConnectionTestInput): Promise<{ ok: boolean; error?: string }> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: TEST_TIMEOUT_MS,
    max: 1,
  });

  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed';
    return { ok: false, error: message };
  } finally {
    await pool.end();
  }
}

export async function createConnection(
  organizationId: string,
  input: ConnectionInput
): Promise<ConnectionPublic> {
  const validation = validateConnectionInput(input, true);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const passwordEncrypted = encryptPassword(input.password!);

  const rows = await query<DatabaseConnection>(
    `INSERT INTO database_connections
       (organization_id, name, host, port, database, username, password_encrypted, ssl)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      organizationId,
      input.name.trim(),
      input.host.trim(),
      input.port ?? 5432,
      input.database.trim(),
      input.username.trim(),
      passwordEncrypted,
      input.ssl ?? false,
    ]
  );

  return toPublic(rows[0]);
}

export async function listConnections(organizationId: string): Promise<ConnectionPublic[]> {
  const rows = await query<DatabaseConnection>(
    `SELECT * FROM database_connections
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
    [organizationId]
  );
  return rows.map(toPublic);
}

export async function getConnectionById(
  organizationId: string,
  connectionId: string
): Promise<DatabaseConnection | null> {
  const rows = await query<DatabaseConnection>(
    `SELECT * FROM database_connections
     WHERE id = $1 AND organization_id = $2`,
    [connectionId, organizationId]
  );
  return rows[0] ?? null;
}

export async function getConnectionConfig(
  organizationId: string,
  connectionId: string
): Promise<ConnectionTestInput | null> {
  const conn = await getConnectionById(organizationId, connectionId);
  if (!conn) return null;

  return {
    host: conn.host,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    password: decryptPassword(conn.password_encrypted),
    ssl: conn.ssl,
  };
}

export async function updateConnection(
  organizationId: string,
  connectionId: string,
  input: Partial<ConnectionInput>
): Promise<ConnectionPublic | null> {
  const existing = await getConnectionById(organizationId, connectionId);
  if (!existing) return null;

  const merged: ConnectionInput = {
    name: input.name ?? existing.name,
    host: input.host ?? existing.host,
    port: input.port ?? existing.port,
    database: input.database ?? existing.database,
    username: input.username ?? existing.username,
    password: input.password,
    ssl: input.ssl ?? existing.ssl,
  };

  const validation = validateConnectionInput(merged, false);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  let passwordEncrypted = existing.password_encrypted;
  if (input.password && input.password.length > 0) {
    passwordEncrypted = encryptPassword(input.password);
  }

  const rows = await query<DatabaseConnection>(
    `UPDATE database_connections
     SET name = $3, host = $4, port = $5, database = $6,
         username = $7, password_encrypted = $8, ssl = $9, updated_at = NOW()
     WHERE id = $1 AND organization_id = $2
     RETURNING *`,
    [
      connectionId,
      organizationId,
      merged.name.trim(),
      merged.host.trim(),
      merged.port,
      merged.database.trim(),
      merged.username.trim(),
      passwordEncrypted,
      merged.ssl,
    ]
  );

  return toPublic(rows[0]);
}

export async function deleteConnection(
  organizationId: string,
  connectionId: string
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `DELETE FROM database_connections
     WHERE id = $1 AND organization_id = $2
     RETURNING id`,
    [connectionId, organizationId]
  );
  return rows.length > 0;
}

export function createUserPool(config: ConnectionTestInput, queryTimeoutMs = 30000): pg.Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
    statement_timeout: queryTimeoutMs,
    query_timeout: queryTimeoutMs,
    max: 2,
  });
}
