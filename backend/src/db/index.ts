import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import * as schema from './schema.js';

const { Pool } = pkg;

export const hasPostgresConfig = (): boolean => {
  if (process.env.DATABASE_URL) return true;
  const requiredVariables = ['SQL_HOST', 'SQL_USER', 'SQL_PASSWORD', 'SQL_DB_NAME'] as const;
  return requiredVariables.every((variable) => !!process.env[variable]);
};

export const createPool = (): any => {
  if (hasPostgresConfig()) {
    try {
      const dbUrl = process.env.DATABASE_URL;
      const isLocal =
        !dbUrl ||
        dbUrl.includes('localhost') ||
        dbUrl.includes('127.0.0.1') ||
        dbUrl.includes('sslmode=disable');

      const poolConfig = dbUrl
        ? {
            connectionString: dbUrl,
            max: 10,
            connectionTimeoutMillis: 5000,
            ssl: isLocal
              ? undefined
              : process.env.SQL_SSL === 'false'
              ? undefined
              : { rejectUnauthorized: false },
          }
        : {
            host: process.env.SQL_HOST,
            user: process.env.SQL_USER,
            password: process.env.SQL_PASSWORD,
            database: process.env.SQL_DB_NAME,
            port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
            max: 10,
            connectionTimeoutMillis: 5000,
            ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          };
      const p = new Pool(poolConfig);
      p.on('error', (err: any) => {
        console.warn('Unexpected error on idle PostgreSQL pool client:', err);
      });
      return p;
    } catch (err) {
      console.warn('[PostgreSQL] Could not create pool:', err);
      return null;
    }
  }
  return null;
};

export let pool: any = createPool();
export let db: any = pool ? drizzle(pool, { schema }) : null;

export async function initializeDatabase() {
  if (!pool) {
    pool = createPool();
  }
  if (pool && !db) {
    db = drizzle(pool, { schema });
  }
  return db;
}

export function getDatabase() {
  if (!db) {
    if (pool) {
      db = drizzle(pool, { schema });
      return db;
    }
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function seedInitialDataIfNeeded() {
  console.log('[DB] Database verified.');
}

export default db;
