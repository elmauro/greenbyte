import { fetchOpenQueue, queryOpenQueue, withOpenQueueClient } from './openQueueDb.js';
import { planMorningLine } from './morningDemo.js';
import { parseNewPo, SapIngestError } from './sapIngestDb.js';

/** Marks the simulated SAP batch rows, so the reset deletes only those. */
export const SAP_BATCH_CSV = 'demo_sap_batch.csv';
const MAX_ORDERS = 20;
const RUNNABLE_STATUS = new Set(['NEW', 'RELEASED', 'STAGED']);

function commentOf(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new SapIngestError(400, 'comment must be text');
  const text = value.trim();
  if (text.length > 300) throw new SapIngestError(400, 'comment must be 300 characters or fewer');
  return text || null;
}

function statusOf(value) {
  if (value === undefined || value === null || value === '') return 'NEW';
  const status = String(value).trim().toUpperCase();
  if (!RUNNABLE_STATUS.has(status)) throw new SapIngestError(400, 'status must be NEW, RELEASED or STAGED');
  return status;
}

export function parseSapBatch(body) {
  const lineId = body?.lineId;
  if (lineId !== 'line-1' && lineId !== 'line-2') throw new SapIngestError(400, 'lineId must be line-1 or line-2');
  const orders = body?.orders;
  if (!Array.isArray(orders) || orders.length === 0 || orders.length > MAX_ORDERS) {
    throw new SapIngestError(400, `orders must be a list of 1 to ${MAX_ORDERS} orders`);
  }
  const seen = new Set();
  const parsed = orders.map((order, index) => {
    const base = parseNewPo({ ...order, lineId });
    if (!/^\d{7,12}$/.test(base.po)) throw new SapIngestError(400, `orders[${index}].po must be 7 to 12 digits`);
    if (seen.has(base.po)) throw new SapIngestError(400, `PO ${base.po} is listed twice`);
    seen.add(base.po);
    if (!base.kg) throw new SapIngestError(400, `orders[${index}].kg must be above 0`);
    if (!base.scheduledFinish) throw new SapIngestError(400, `orders[${index}].scheduledFinish required`);
    return {
      ...base,
      variety: typeof order.variety === 'string' && order.variety.trim() ? order.variety.trim() : null,
      comment: commentOf(order.comment),
      status: statusOf(order.status),
    };
  });
  return { lineId, orders: parsed, plan: body.plan === true };
}

async function clearLinePlans(client, workCenterId) {
  await client.query('UPDATE gold.schedule_plan SET parent_plan_id = NULL WHERE work_center_id = $1', [workCenterId]);
  const cleared = await client.query('DELETE FROM gold.schedule_plan WHERE work_center_id = $1', [workCenterId]);
  return cleared.rowCount;
}

async function inTransaction(fn) {
  return withOpenQueueClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') throw new SapIngestError(409, 'PO already exists');
      throw err;
    }
  });
}

async function workCenterOf(client, lineId) {
  const line = await client.query('SELECT work_center_id FROM silver.work_center WHERE demo_line_id = $1', [lineId]);
  if (!line.rowCount) throw new SapIngestError(404, `Unknown line ${lineId}`);
  return line.rows[0].work_center_id;
}

async function insertOrder(client, workCenterId, order) {
  const species = await client.query('SELECT species_id FROM silver.species WHERE species_code = $1', [order.species]);
  if (!species.rowCount) throw new SapIngestError(400, `Unknown species ${order.species}`);
  const material = order.variety
    ? await client.query(
      `SELECT m.material_id
       FROM silver.material m
       WHERE m.variety_code = $1 AND m.species_id = $2
       ORDER BY m.material_id
       LIMIT 1`,
      [order.variety, species.rows[0].species_id],
    )
    : { rows: [] };
  const materialId = material.rows[0]?.material_id ?? null;
  const po = await client.query(
    `INSERT INTO silver.process_order (
       po_number, po_type, material_id, species_id, work_center_id, is_in_sap, sap_status,
       planned_output_qty, uom_code, sap_finish_date, priority_rank, source_csv, source_row_number
     )
     VALUES (
       $1, 'PRODUCTION', $2, $3, $4, true, 'NEW', $5, 'KG', $6::date, $7, $8,
       (SELECT coalesce(max(source_row_number), 0) + 1 FROM silver.process_order WHERE source_csv = $8)
     )
     RETURNING process_order_id`,
    [order.po, materialId, species.rows[0].species_id, workCenterId, order.kg, order.scheduledFinish, order.priority, SAP_BATCH_CSV],
  );
  await client.query(
    `INSERT INTO silver.line_schedule_item (
       process_order_id, po_number_raw, po_number_status, work_center_id, material_id,
       species_code, status_code, priority_rank, scheduled_finish_date,
       input_kg, uom_code, trait_family_code, comments, source_csv, source_row_number
     )
     VALUES (
       $1, $2, 'VALID', $3, $4, $5, $6, $7, $8::date, $9, 'KG', 'NONE', $10, $11,
       (SELECT coalesce(max(source_row_number), 0) + 1 FROM silver.line_schedule_item WHERE source_csv = $11)
     )`,
    [
      po.rows[0].process_order_id, order.po, workCenterId, materialId, order.species, order.status,
      order.priority, order.scheduledFinish, order.kg, order.comment, SAP_BATCH_CSV,
    ],
  );
}

/**
 * Simulated SAP batch: inserts the orders and their comments on one line, registers the comments
 * as gold source notes and clears the line's plans so the raw queue shows. With plan: true the
 * engine then runs once on that line (JEV reads the comments, Bedrock comments every PO).
 */
export async function ingestSapBatch(body) {
  const batch = parseSapBatch(body);
  const staged = await inTransaction(async (client) => {
    const workCenterId = await workCenterOf(client, batch.lineId);
    const existing = await client.query(
      'SELECT po_number FROM silver.process_order WHERE po_number = ANY($1::text[])',
      [batch.orders.map((order) => order.po)],
    );
    if (existing.rowCount) {
      throw new SapIngestError(409, `Already loaded: ${existing.rows.map((row) => row.po_number).join(', ')}. Reset the batch first.`);
    }
    for (const order of batch.orders) await insertOrder(client, workCenterId, order);
    const notes = await client.query('SELECT gold.refresh_source_notes() AS created');
    return { notesCreated: Number(notes.rows[0]?.created ?? 0), plansCleared: await clearLinePlans(client, workCenterId) };
  });
  const inserted = batch.orders.map((order) => order.po);
  if (!batch.plan) {
    return { lineId: batch.lineId, inserted, ...staged, queue: await fetchOpenQueue(batch.lineId) };
  }
  const plan = await planMorningLine(queryOpenQueue, batch.lineId);
  return {
    lineId: batch.lineId,
    inserted,
    ...staged,
    planVersion: plan.planVersion,
    queue: plan.queue,
    explanation: plan.explanation,
  };
}

/**
 * Deletes the simulated batch orders of one line and everything derived from them (plans, notes,
 * facts, the JEV readings no other note uses), so the demo can run again from scratch.
 */
export async function resetSapBatch(lineId) {
  return inTransaction(async (client) => {
    const workCenterId = await workCenterOf(client, lineId);
    const rows = await client.query(
      `SELECT line_schedule_item_id, process_order_id
       FROM silver.line_schedule_item
       WHERE source_csv = $1 AND work_center_id = $2`,
      [SAP_BATCH_CSV, workCenterId],
    );
    const plansCleared = await clearLinePlans(client, workCenterId);
    if (!rows.rowCount) return { lineId, removed: [], plansCleared };
    const items = rows.rows.map((row) => row.line_schedule_item_id);
    const orders = rows.rows.map((row) => row.process_order_id).filter((id) => id != null);
    const notes = await client.query(
      `SELECT source_note_id, note_hash FROM gold.source_note
       WHERE line_schedule_item_id = ANY($1::bigint[]) OR process_order_id = ANY($2::bigint[])`,
      [items, orders],
    );
    const noteIds = notes.rows.map((row) => row.source_note_id);
    const hashes = [...new Set(notes.rows.map((row) => row.note_hash))];
    await client.query(
      `DELETE FROM gold.entry_reason_fact WHERE semantic_fact_id IN (
         SELECT semantic_fact_id FROM gold.semantic_fact
         WHERE source_note_id = ANY($1::bigint[]) OR process_order_id = ANY($2::bigint[]))`,
      [noteIds, orders],
    );
    await client.query(
      'DELETE FROM gold.semantic_fact WHERE source_note_id = ANY($1::bigint[]) OR process_order_id = ANY($2::bigint[])',
      [noteIds, orders],
    );
    await client.query('DELETE FROM gold.source_note WHERE source_note_id = ANY($1::bigint[])', [noteIds]);
    await client.query(
      `DELETE FROM raw.note_reading nr
       WHERE nr.note_hash = ANY($1::char(64)[])
         AND NOT EXISTS (SELECT 1 FROM gold.source_note sn WHERE sn.note_hash = nr.note_hash)`,
      [hashes],
    );
    await client.query('UPDATE gold.plan_event SET process_order_id = NULL WHERE process_order_id = ANY($1::bigint[])', [orders]);
    await client.query('DELETE FROM gold.repair_proposal WHERE parent_process_order_id = ANY($1::bigint[])', [orders]);
    for (const table of [
      'gold.plan_override', 'silver.quality_test', 'silver.process_order_change', 'silver.order_allocation',
      'silver.conditioning_run', 'silver.process_order_source', 'silver.process_order_work_center',
    ]) {
      await client.query(`DELETE FROM ${table} WHERE process_order_id = ANY($1::bigint[])`, [orders]);
    }
    await client.query('DELETE FROM silver.line_schedule_item WHERE line_schedule_item_id = ANY($1::bigint[])', [items]);
    const removed = await client.query(
      'DELETE FROM silver.process_order WHERE process_order_id = ANY($1::bigint[]) RETURNING po_number',
      [orders],
    );
    return { lineId, removed: removed.rows.map((row) => row.po_number), plansCleared };
  });
}
