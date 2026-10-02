import { applyPlannerEvent, computePlan } from '../planner/index.js';
import { snapshotFromGold } from '../snapshot/mapSnapshot.js';

const OPEN_QUEUE_SQL = `
  SELECT *
  FROM gold.v_open_queue
  WHERE demo_line_id IN ('line-1', 'line-2')
     OR work_center_code IN ('LSVGRVTY', 'LSVCLSRT')
`;

export async function loadSnapshot(query, { asOf, repairLineId } = {}) {
  const [queue, rules, changeovers, throughput, previous] = await Promise.all([
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
      WHERE sp.created_by = 'planner-v2'
        AND wc.demo_line_id IN ('line-1', 'line-2')
      ORDER BY wc.demo_line_id, sp.plan_version DESC
    `),
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
  return snapshotFromGold({
    asOf: asOf || new Date().toISOString(),
    repairLineId,
    rows: queue.rows,
    rules: rules.rows[0]?.value,
    changeovers: changeovers.rows,
    throughput: throughput.rows,
    facts: facts.rows,
    previousPayload: mergePayloads(previous.rows),
  });
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

const EVENT_TYPE = {
  new_order: 'queue_refresh',
  priority_change: 'queue_refresh',
  rush: 'rush',
  qa_fail: 'qa_fail',
  line_down: 'manual_adjust',
  line_swap: 'manual_adjust',
};

export async function savePlan(query, { payloads, eventType, lineIds }) {
  const saved = [];
  for (const lineId of lineIds || Object.keys(payloads)) {
    const payload = payloads[lineId];
    if (!payload) continue;
    const inserted = await query(
      `INSERT INTO gold.plan_event (work_center_id, event_type, source, payload, created_by)
       SELECT work_center_id, $2, 'ui_manual', $3::jsonb, 'planner-v2'
       FROM silver.work_center
       WHERE demo_line_id = $1
       RETURNING plan_event_id`,
      [lineId, EVENT_TYPE[eventType] || 'queue_refresh', JSON.stringify(payload)],
    );
    const planEventId = inserted.rows[0]?.plan_event_id;
    const plan = await query(`SELECT gold.replan($1, $2) AS schedule_plan_id`, [lineId, planEventId]);
    saved.push({ lineId, planEventId, schedulePlanId: plan.rows[0]?.schedule_plan_id });
  }
  return saved;
}

export function planFromSnapshot(snapshot, event) {
  if (!event) return computePlan(snapshot);
  return applyPlannerEvent(snapshot, event);
}
