import { applyPlannerEvent, computePlan } from '../planner/index.js';
import { snapshotFromGold } from '../snapshot/mapSnapshot.js';

export const PLANNER_VERSION = 'planner-v2';

const OPEN_QUEUE_SQL = `
  SELECT *
  FROM gold.v_open_queue
  WHERE demo_line_id IN ('line-1', 'line-2')
     OR work_center_code IN ('LSVGRVTY', 'LSVCLSRT')
`;

export class PlannerNotReadyError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

export async function loadSnapshot(query, { asOf, repairLineId } = {}) {
  const [queue, rules, changeovers, throughput, previous, baseline, clock] = await Promise.all([
    query(OPEN_QUEUE_SQL),
    query(`SELECT value FROM gold.config WHERE config_key = 'planner_rules'`),
    query(`
      SELECT wc.work_center_code, r.transition_code, r.hours
      FROM gold.changeover_rule r
      JOIN silver.work_center wc USING (work_center_id)
      WHERE wc.work_center_code IN ('LSVLN1', 'LSVLN2')
    `),
    query(`
      SELECT work_center_code, species_code, grain, median_kg_per_h
      FROM gold.v_throughput
      WHERE work_center_code IN ('LSVLN1', 'LSVLN2')
    `),
    query(`
      SELECT DISTINCT ON (wc.demo_line_id) pe.payload
      FROM gold.schedule_plan sp
      JOIN gold.plan_event pe ON pe.plan_event_id = sp.plan_event_id
      JOIN silver.work_center wc ON wc.work_center_id = sp.work_center_id
      WHERE sp.created_by = '${PLANNER_VERSION}'
        AND wc.demo_line_id IN ('line-1', 'line-2')
      ORDER BY wc.demo_line_id, sp.plan_version DESC
    `),
    // An ingest replans with the heuristic just before the planner runs, so the last planner-v2
    // plan (when there is one) is what the scheduler was looking at.
    query(`
      WITH base AS (
        SELECT DISTINCT ON (sp.work_center_id) sp.schedule_plan_id
        FROM gold.schedule_plan sp
        JOIN silver.work_center wc ON wc.work_center_id = sp.work_center_id
        WHERE wc.demo_line_id IN ('line-1', 'line-2')
        ORDER BY sp.work_center_id, (sp.created_by = '${PLANNER_VERSION}') DESC, sp.plan_version DESC
      )
      SELECT po.po_number, se.position, se.is_at_risk
      FROM base
      JOIN gold.schedule_entry se ON se.schedule_plan_id = base.schedule_plan_id
      JOIN silver.process_order po ON po.process_order_id = se.process_order_id
    `),
    asOf ? Promise.resolve(null) : query(`SELECT gold.cfg('plan_start_at')::timestamptz AS as_of`),
  ]);
  const poNumbers = queue.rows.map((row) => row.po_number);
  const facts = poNumbers.length
    ? await query(
      `SELECT f.*, po.po_number
       FROM gold.v_trusted_fact f
       JOIN silver.process_order po USING (process_order_id)
       WHERE po.po_number = ANY($1::text[])
         AND f.status IN ('AUTO', 'CONFIRMED')`,
      [poNumbers],
    )
    : { rows: [] };
  const clockAt = clock?.rows?.[0]?.as_of;
  return snapshotFromGold({
    asOf: toIso(asOf || clockAt || new Date()),
    repairLineId,
    rows: queue.rows,
    rules: rules.rows[0]?.value,
    changeovers: changeovers.rows,
    throughput: throughput.rows,
    facts: facts.rows,
    previousPayload: {
      ...mergePayloads(previous.rows),
      entries: baseline.rows.map((row) => ({
        poNumber: row.po_number,
        position: Number(row.position),
        isAtRisk: row.is_at_risk === true,
      })),
    },
  });
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mergePayloads(rows) {
  const merged = { entries: [], downtime: [], overrides: [], proposals: [] };
  const seen = new Set();
  for (const row of rows) {
    const payload = row.payload || {};
    for (const key of Object.keys(merged)) {
      for (const item of payload[key] || []) {
        const marker = JSON.stringify(item);
        if (seen.has(marker)) continue;
        seen.add(marker);
        merged[key].push(item);
      }
    }
  }
  return merged;
}

export async function replanSupportsEntries(query) {
  const { rows } = await query(
    `SELECT position('entries' in pg_get_functiondef('gold.replan(text,bigint)'::regprocedure)) > 0 AS ok`,
  );
  return rows[0]?.ok === true;
}

// gold.replan fills previous_position from the parent plan only when the key is absent.
function withoutUnknownPrevious(entry) {
  if (entry.previousPosition != null) return entry;
  const { previousPosition, ...rest } = entry;
  return rest;
}

function linesToSave(payloads, focusLineId) {
  return Object.keys(payloads).filter((lineId) => {
    const entries = payloads[lineId]?.entries || [];
    if (entries.length === 0) return false;
    if (!focusLineId || lineId === focusLineId) return true;
    return entries.some((entry) => entry.previousPosition !== entry.position);
  });
}

export async function savePlan(query, { payloads, eventType, lineIds, focusPo, focusLineId }) {
  if (!(await replanSupportsEntries(query))) {
    throw new PlannerNotReadyError('gold.replan does not read payload.entries yet (Camilo handoff section 3)');
  }
  const saved = [];
  for (const lineId of lineIds || linesToSave(payloads, focusLineId)) {
    const payload = payloads[lineId];
    if (!payload) continue;
    const inserted = await query(
      `INSERT INTO gold.plan_event (work_center_id, event_type, source, process_order_id, payload, created_by)
       SELECT wc.work_center_id, 'planner_run', 'ui_manual',
              (SELECT process_order_id FROM silver.process_order WHERE po_number = $3),
              $2::jsonb, '${PLANNER_VERSION}'
       FROM silver.work_center wc
       WHERE wc.demo_line_id = $1
       RETURNING plan_event_id`,
      [lineId, JSON.stringify({ ...payload, entries: payload.entries.map(withoutUnknownPrevious), trigger: eventType || 'queue_refresh' }), focusPo ?? null],
    );
    const planEventId = inserted.rows[0]?.plan_event_id;
    const plan = await query(`SELECT gold.replan($1, $2) AS schedule_plan_id`, [lineId, planEventId]);
    saved.push({ lineId, planEventId, schedulePlanId: plan.rows[0]?.schedule_plan_id });
  }
  return saved;
}

export async function plannerPayloadForPlan(query, schedulePlanId) {
  const { rows } = await query(
    `SELECT pe.payload
     FROM gold.schedule_plan sp
     JOIN gold.plan_event pe ON pe.plan_event_id = sp.plan_event_id
     WHERE sp.schedule_plan_id = $1
       AND sp.created_by = '${PLANNER_VERSION}'`,
    [schedulePlanId],
  );
  return rows[0]?.payload ?? null;
}

const JEV_PROMPT_VERSION = 'facts-v1';
const FACT_TYPES = new Set(['NOT_READY', 'HOLD', 'RELEASE', 'RUSH', 'DEADLINE', 'INFO']);

function confidenceOf(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0.8;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/**
 * Reads every schedule-row note of these rows that JEV has not read yet and stores the reading in
 * raw.note_reading (reader BEDROCK = model reader, so it outranks rules-v1 in v_note_reading_current).
 * A failed JEV call stores the rules-v1 reading instead, so the note still counts and JEV retries next run.
 * Returns the number of texts read.
 */
export async function readNotesWithJev(query, lineScheduleItemIds, classify) {
  if (!lineScheduleItemIds.length) return 0;
  const { rows } = await query(
    `SELECT DISTINCT sn.note_text
     FROM gold.source_note sn
     WHERE sn.line_schedule_item_id = ANY($1::bigint[])
       AND nullif(btrim(sn.note_text), '') IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM raw.note_reading nr
         WHERE nr.note_hash = sn.note_hash AND nr.reader = 'BEDROCK'
           AND nr.model_id LIKE 'typesafe/jev%' AND nr.prompt_version = $2)`,
    [lineScheduleItemIds, JEV_PROMPT_VERSION],
  );
  if (!rows.length) return 0;
  const readings = await mapLimit(rows, 6, async ({ note_text: text }) => {
    try {
      const guess = await classify(text);
      if (FACT_TYPES.has(guess?.fact_type)) {
        return {
          text,
          reader: 'BEDROCK',
          model_id: guess.modelId || 'typesafe/jev-1.13',
          prompt_version: JEV_PROMPT_VERSION,
          facts: [{
            fact_type: guess.fact_type,
            fact_value: guess.fact_value || {},
            applies_to: guess.applies_to || 'PO',
            confidence: confidenceOf(guess.confidence),
          }],
        };
      }
    } catch (err) {
      console.warn('jev note skipped:', err.message);
    }
    return { text, reader: 'RULE', model_id: 'rules-v1', prompt_version: 'v1', facts: null };
  });
  await query(
    `INSERT INTO raw.note_reading (note_hash, note_text, reader, model_id, prompt_version, facts, read_by)
     SELECT gold.note_hash(r.text), btrim(r.text), r.reader, r.model_id, r.prompt_version,
            coalesce(r.facts, gold.rules_v1_facts(r.text)), '${PLANNER_VERSION}'
     FROM jsonb_to_recordset($1::jsonb) AS r (text text, reader text, model_id text, prompt_version text, facts jsonb)
     ON CONFLICT (note_hash, reader, model_id, prompt_version) DO NOTHING`,
    [JSON.stringify(readings)],
  );
  await query('SELECT gold.refresh_semantic_facts()');
  return readings.length;
}

export function planFromSnapshot(snapshot, event) {
  if (!event) return computePlan(snapshot);
  return applyPlannerEvent(snapshot, event);
}
