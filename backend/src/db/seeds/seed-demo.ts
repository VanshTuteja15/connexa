import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { encryptPassword } from '../../utils/encryption';

dotenv.config();

const { Pool } = pg;

async function seedDemo(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).sort();
    for (const file of migrationFiles) {
      if (!file.endsWith('.sql')) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`Running migration: ${file}`);
      await pool.query(sql);
    }

    const demoSql = fs.readFileSync(path.join(__dirname, 'demo.sql'), 'utf8');
    console.log('Seeding demo data...');
    await pool.query(demoSql);

    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = parseInt(url.port || '5432', 10);
    const database = url.pathname.replace('/', '');
    const username = url.username;
    const password = url.password;

    const orgRows = await pool.query<{ id: string }>(
      'SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1'
    );

    if (orgRows.rows.length > 0) {
      const orgId = orgRows.rows[0].id;
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM database_connections
         WHERE organization_id = $1 AND name = 'Demo Database'`,
        [orgId]
      );

      if (existing.rows.length === 0) {
        const passwordEncrypted = encryptPassword(password);
        await pool.query(
          `INSERT INTO database_connections
             (organization_id, name, host, port, database, username, password_encrypted, ssl)
           VALUES ($1, 'Demo Database', $2, $3, $4, $5, $6, false)`,
          [orgId, host, port, database, username, passwordEncrypted]
        );
        console.log('Demo connection registered for first organization.');
      } else {
        console.log('Demo connection already exists.');
      }
    } else {
      console.log('No organizations found. Register an account first, then re-run seed:demo.');
    }

    console.log('Demo seed complete.');
  } finally {
    await pool.end();
  }
}

seedDemo().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
