import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>>;
  close(): Promise<void>;
  type: 'postgres' | 'sqlite';
}

class PostgresAdapter implements DbClient {
  public type: 'postgres' = 'postgres';
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.db.url,
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount ?? res.rows.length,
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class SqliteAdapter implements DbClient {
  public type: 'sqlite' = 'sqlite';
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new sqlite3.Database(dbPath);
  }

  query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    return new Promise((resolve, reject) => {
      // Convert $1, $2 to ? for sqlite
      let normalizedSql = sql.replace(/\$(\d+)/g, '?');

      // Check if it's a SELECT query
      const isSelect = /^\s*SELECT/i.test(normalizedSql);

      if (isSelect) {
        this.db.all(normalizedSql, params, (err, rows: any[]) => {
          if (err) return reject(err);
          resolve({ rows: (rows || []) as T[], rowCount: (rows || []).length });
        });
      } else {
        this.db.run(normalizedSql, params, function (this: sqlite3.RunResult, err) {
          if (err) return reject(err);
          // If INSERT with RETURNING or just need changes
          resolve({ rows: [{ id: this.lastID }] as any[], rowCount: this.changes });
        });
      }
    });
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

let dbInstance: DbClient;

export async function initDb(): Promise<DbClient> {
  if (dbInstance) return dbInstance;

  if (config.db.type === 'postgres') {
    try {
      const pgAdapter = new PostgresAdapter();
      // Test connection
      await pgAdapter.query('SELECT 1');
      console.log('✓ Connected to Amazon RDS PostgreSQL database successfully.');
      dbInstance = pgAdapter;
      return dbInstance;
    } catch (err: any) {
      console.warn(`[DB WARNING] PostgreSQL connection failed (${err.message}). Falling back to SQLite for local development.`);
    }
  }

  const sqliteFile = path.resolve(process.cwd(), 'data', 'portal.sqlite');
  console.log(`✓ Initialized SQLite database at: ${sqliteFile}`);
  dbInstance = new SqliteAdapter(sqliteFile);
  return dbInstance;
}

export function getDb(): DbClient {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return dbInstance;
}
