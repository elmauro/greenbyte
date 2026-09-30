import pg from 'pg';
import { mapOpenQueue } from './openQueueMap.js';

const { Pool } = pg;

let pool;

export function isOpenQueueDbConfigured() {
  if (process.env.DATABASE_URL?.trim()) return true;
  return Boolean(process.env.PGHOST?.trim() && process.env.PGUSER?.trim() && process.env.PGPASSWORD);
}

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL?.trim();
    const ssl = process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false };
    pool = connectionString
      ? new Pool({ connectionString, max: 1, ssl, connectionTimeoutMillis: 8000 })
      : new Pool({
          host: process.env.PGHOST,
          port: Number(process.env.PGPORT || 5432),
          database: process.env.PGDATABASE || 'greenbyte',
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
          max: 1,
          ssl,
          connectionTimeoutMillis: 8000,
        });
  }
  return pool;
}

/**
 * Active, non-complete conditioning orders for one line.
 * Source: gold.v_open_queue on the greenbyte database.
 *
 * @param {string} lineId
 */
export async function fetchOpenQueue(lineId) {
  const { rows } = await getPool().query('SELECT * FROM gold.v_open_queue');
  const queue = mapOpenQueue(rows, lineId);
  if (rows.length > 0 && queue.length === 0) {
    console.error('gold.v_open_queue returned rows but none matched line', {
      lineId,
      columns: Object.keys(rows[0]),
    });
  }
  return queue;
}
