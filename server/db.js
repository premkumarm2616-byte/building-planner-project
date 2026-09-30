// Database layer — uses libSQL (@libsql/client).
//
// In the cloud (Render) it connects to a Turso cloud database that PERSISTS,
// using the environment variables TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.
// On your own computer, if those are not set, it automatically falls back to a
// local file (server/local.db) so everything still works offline for testing.
//
// The API here (get / all / run) is async — every call returns a Promise — so
// the routes in server.js use async/await.
import { createClient } from '@libsql/client';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'local.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

export const client = createClient(authToken ? { url, authToken } : { url });

// Turn a libSQL result into plain { column: value } objects (named access only),
// converting any BigInt ids to normal numbers so JSON serialisation is safe.
function toObjects(result) {
  const cols = result.columns || [];
  return (result.rows || []).map((r) => {
    const o = {};
    for (let i = 0; i < cols.length; i++) {
      let v = r[i];
      if (typeof v === 'bigint') v = Number(v);
      o[cols[i]] = v;
    }
    return o;
  });
}

// Return all matching rows as an array of objects.
export async function all(sql, args = []) {
  const res = await client.execute({ sql, args });
  return toObjects(res);
}

// Return the first matching row (or null).
export async function get(sql, args = []) {
  const rows = await all(sql, args);
  return rows[0] || null;
}

// Run an INSERT/UPDATE/DELETE; returns { lastInsertRowid, rowsAffected }.
export async function run(sql, args = []) {
  const res = await client.execute({ sql, args });
  return {
    lastInsertRowid: res.lastInsertRowid != null ? Number(res.lastInsertRowid) : null,
    rowsAffected: res.rowsAffected,
  };
}

// Create the tables (if missing) and seed the material price list once.
export async function initDb() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      is_admin      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id        INTEGER NOT NULL,
      name           TEXT    NOT NULL,
      plot_length    REAL,
      plot_width     REAL,
      floors         INTEGER,
      facing         TEXT,
      budget         REAL,
      bedrooms       INTEGER,
      bathrooms      INTEGER,
      parking        INTEGER,
      garden         INTEGER,
      balcony        INTEGER,
      status         TEXT    NOT NULL DEFAULT 'In Progress',
      ai_suggestions TEXT,
      created_at     TEXT    NOT NULL,
      updated_at     TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS material_prices (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL,
      unit  TEXT NOT NULL,
      price REAL NOT NULL
    );
  `);

  const c = await get('SELECT COUNT(*) AS n FROM material_prices');
  if (!c || Number(c.n) === 0) {
    const seed = [
      ['Cement (per bag)', '50kg', 420],
      ['Steel (per tonne)', 'tonne', 62000],
      ['Bricks (per 1000)', '1000 nos', 6500],
      ['Sand (per cu ft)', 'cu ft', 55],
    ];
    for (const [name, unit, price] of seed) {
      await run('INSERT INTO material_prices (name, unit, price) VALUES (?, ?, ?)', [name, unit, price]);
    }
  }
}
