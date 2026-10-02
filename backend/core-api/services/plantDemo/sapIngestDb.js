import { PLANT_DEMO_LINE_ID } from './constants.js';
import { fetchOpenQueue, queryOpenQueue, withOpenQueueClient } from './openQueueDb.js';
import { pendingQueue } from './openQueueMap.js';
import {
  attachPlanExplanation,
  localeOf,
  normalizePlanQueue,
  queueResponseFromPlan,
  rushKind,
  titleCaseToken,
} from './planExplanation.js';
import { plannerExplanationForPoll, semanticPlannerEnabled, withSemanticPlan } from './semanticReplan.js';

export class SapIngestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function lineIdOf(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : PLANT_DEMO_LINE_ID;
}

function poOf(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new SapIngestError(400, 'po required');
  }
  return value.trim();
}

function priorityOf(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 99) {
    throw new SapIngestError(400, 'priority must be an integer from 1 to 99');
  }
  return n;
}

function finishOf(value) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(text)) {
    throw new SapIngestError(400, 'scheduledFinish must start with YYYY-MM-DD');
  }
  return text.slice(0, 10);
}

function speciesOf(value) {
  if (typeof value !== 'string' || !/^[A-Za-z]{4}$/.test(value.trim())) {
    throw new SapIngestError(400, 'species required (4-letter code, for example SWCO)');
  }
  return value.trim().toUpperCase();
}

function kgOf(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new SapIngestError(400, 'kg must be a non-negative number');
  }
  return n;
}

export function parsePriorityChange(body) {
  const priority = priorityOf(body.priority);
  const scheduledFinish = finishOf(body.scheduledFinish ?? body.finish);
  if (priority === null && scheduledFinish === null) {
    throw new SapIngestError(400, 'priority and/or scheduledFinish required');
  }
  return {
    lineId: lineIdOf(body.lineId),
    po: poOf(body.po),
    priority,
    scheduledFinish,
    rush: body.rush === true,
  };
}

export function parsePassFail(body) {
  const passFail = body.passFail ?? body.pass_fail;
  if (passFail !== 'Fail') {
    throw new SapIngestError(400, 'Only passFail Fail triggers replan in demo ingest');
  }
  const failedFor = body.failedFor ?? body.failed_for;
  if (typeof failedFor !== 'string' || !failedFor.trim()) {
    throw new SapIngestError(400, 'failedFor required (Dent, Discolored, Cob, ...)');
  }
  const lineId = lineIdOf(body.lineId);
  const equipmentId = body.equipmentId ?? body.equipment_id;
  const equipment = typeof equipmentId === 'string' && equipmentId.trim()
    ? equipmentId.trim()
    : `Line ${lineId.replace('line-', '')}`;
  return {
    lineId,
    po: poOf(body.po),
    passFail: 'Fail',
    failedFor: failedFor.trim(),
    equipmentId: equipment,
  };
}

export function parseAccept(body) {
  const rawVersion = body.planVersion;
  let planVersion = null;
  if (rawVersion !== undefined && rawVersion !== null && rawVersion !== '') {
    const n = Number(rawVersion);
    if (!Number.isInteger(n) || n < 1) {
      throw new SapIngestError(400, 'planVersion must be a positive integer');
    }
    planVersion = n;
  }
  let comment = null;
  if (body.comment !== undefined && body.comment !== null && body.comment !== '') {
    if (typeof body.comment !== 'string') {
      throw new SapIngestError(400, 'comment must be text');
    }
    comment = body.comment.trim() || null;
  }
  return {
    lineId: lineIdOf(body.lineId),
    planVersion,
    comment,
  };
}

export function parseNewPo(body) {
  return {
    lineId: lineIdOf(body.lineId),
    po: poOf(body.po),
    species: speciesOf(body.species),
    kg: kgOf(body.kg),
    priority: priorityOf(body.priority),
    scheduledFinish: finishOf(body.scheduledFinish ?? body.finish),
  };
}

function mapPgError(err) {
  if (err instanceof SapIngestError) return err;
  if (err.code === '23505') return new SapIngestError(409, 'PO already exists');
  if (err.code === '40001') return new SapIngestError(409, err.message);
  if (err.code === 'P0002') return new SapIngestError(404, err.message);
  if (err.code === '22023' || err.code === '23514' || err.code === '22P02') {
    return new SapIngestError(400, err.message);
  }
  return err;
}

async function explainOrPlan(plan, context) {
  try {
    return await attachPlanExplanation(plan, context);
  } catch (err) {
    console.error('explain-replan', err);
    return plan;
  }
}

async function reasonHints(planId) {
  const { rows } = await queryOpenQueue(
    `SELECT rc.reason_code, er.params
     FROM gold.schedule_entry se
     JOIN gold.entry_reason er ON er.schedule_entry_id = se.schedule_entry_id
     JOIN gold.reason_code rc ON rc.reason_code_id = er.reason_code_id
     WHERE se.schedule_plan_id = $1
       AND rc.reason_code IN ('QA_HOLD', 'RUSH_PRIORITY')
     ORDER BY se.position, er.seq`,
    [planId],
  );
  let failedFor = null;
  let priority = null;
  for (const row of rows) {
    const params = row.params ?? {};
    if (row.reason_code === 'QA_HOLD' && failedFor == null && params.fail_reason) {
      failedFor = titleCaseToken(params.fail_reason);
    }
    if (row.reason_code === 'RUSH_PRIORITY' && priority == null && params.priority_rank != null) {
      priority = Number(params.priority_rank);
    }
  }
  return { failedFor, priority };
}

/** Rush tags and planned starts for the plan the screen is showing. */
async function planMarks(schedulePlanId) {
  const { rows } = await queryOpenQueue(
    `SELECT q.po_number, q.reasons,
            to_char(q.planned_start_at AT TIME ZONE gold.cfg('plant_time_zone'), 'YYYY-MM-DD HH24:MI') AS planned_start
     FROM gold.v_plan_queue q
     WHERE q.schedule_plan_id = $1`,
    [schedulePlanId],
  );
  const rushByPo = {};
  const startByPo = {};
  for (const row of rows) {
    const po = String(row.po_number);
    const kind = rushKind(row.reasons);
    if (kind) rushByPo[po] = kind;
    if (row.planned_start) startByPo[po] = String(row.planned_start);
  }
  return { rushByPo, startByPo };
}

/**
 * Scheduler poll. The latest plan (proposed or accepted) is the queue on
 * screen, in that array order. A proposed plan also returns the simulated
 * copilot. With no plan, rows come from the open queue.
 */
export async function fetchSchedulerQueue(lineId, locale) {
  const latest = await queryOpenQueue(
    `SELECT sp.schedule_plan_id, sp.status, sp.plan_version, sp.created_by
     FROM silver.work_center wc
     LEFT JOIN gold.v_latest_plan sp ON sp.work_center_id = wc.work_center_id
     WHERE wc.demo_line_id = $1`,
    [lineId],
  );
  const row = latest.rows[0];
  if (row?.schedule_plan_id != null && (row.status === 'PROPOSED' || row.status === 'ACCEPTED')) {
    const { rows } = await queryOpenQueue('SELECT gold.event_response($1) AS result', [
      row.schedule_plan_id,
    ]);
    const plan = rows[0]?.result;
    if (plan) {
      const { rushByPo, startByPo } = await planMarks(row.schedule_plan_id);
      if (row.status === 'PROPOSED' && row.created_by === 'planner-v2') {
        const { explanation, eventType, poNotes } = await plannerExplanationForPoll(
          queryOpenQueue,
          row.schedule_plan_id,
          plan,
        );
        return queueResponseFromPlan({ ...plan, eventType }, explanation, poNotes, rushByPo, startByPo);
      }
      if (row.status === 'PROPOSED') {
        const hints = await reasonHints(row.schedule_plan_id);
        const explained = await explainOrPlan(plan, { locale: localeOf(locale), ...hints });
        return queueResponseFromPlan(explained, explained.explanation ?? null, {}, rushByPo, startByPo);
      }
      const version = Number(plan.planVersion) || Number(row.plan_version) || 1;
      const poNotes = row.created_by === 'planner-v2'
        ? (await plannerExplanationForPoll(queryOpenQueue, row.schedule_plan_id, plan)).poNotes
        : {};
      return {
        lineId: plan.lineId ?? lineId,
        queue: normalizePlanQueue(plan.queue, poNotes, rushByPo, startByPo),
        planVersion: version,
        lastEvent: null,
        acceptedPlanVersion: version,
        pendingExplanation: null,
        pendingDiff: null,
      };
    }
  }

  const queue = pendingQueue(await fetchOpenQueue(lineId));
  const version = row?.plan_version != null ? Number(row.plan_version) : 1;
  return {
    lineId,
    queue,
    planVersion: version,
    lastEvent: null,
    acceptedPlanVersion: row?.status === 'ACCEPTED' ? version : null,
    pendingExplanation: null,
    pendingDiff: null,
  };
}

/** QA fail on a lot already in process. Writes raw.ingest_event and silver.quality_test, then replans. */
export async function recordPassFail(body) {
  const parsed = parsePassFail(body);
  const context = { locale: localeOf(body.locale), focusPo: parsed.po, failedFor: parsed.failedFor };
  let result;
  try {
    const { rows } = await queryOpenQueue(
      'SELECT gold.ingest_pass_fail($1, $2, $3, $4, $5, NULL, CURRENT_USER) AS result',
      [parsed.lineId, parsed.po, parsed.passFail, parsed.failedFor, parsed.equipmentId],
    );
    result = rows[0].result;
  } catch (err) {
    const mapped = mapPgError(err);
    if (mapped instanceof SapIngestError && mapped.status === 404 && semanticPlannerEnabled()) {
      return withSemanticPlan(
        queryOpenQueue,
        { lineId: parsed.lineId, kind: 'qa_fail_finished', po: parsed.po, failedFor: parsed.failedFor },
        () => { throw mapped; },
      );
    }
    throw mapped;
  }
  return withSemanticPlan(
    queryOpenQueue,
    { lineId: parsed.lineId, kind: 'qa_fail', po: parsed.po, failedFor: parsed.failedFor },
    () => explainOrPlan(result, context),
  );
}

/**
 * Human sign-off on the latest proposed plan for a line.
 * Calls gold.accept_plan: inserts gold.plan_decision (ACCEPT) and sets gold.schedule_plan to ACCEPTED.
 * Does not write SAP, raw extracts, or silver rows.
 */
export async function acceptProposedPlan(body) {
  const parsed = parseAccept(body);
  try {
    const latest = await queryOpenQueue(
      `SELECT sp.status, sp.plan_version
       FROM silver.work_center wc
       LEFT JOIN gold.v_latest_plan sp ON sp.work_center_id = wc.work_center_id
       WHERE wc.demo_line_id = $1`,
      [parsed.lineId],
    );
    if (!latest.rowCount) {
      throw new SapIngestError(404, `Unknown line ${parsed.lineId}`);
    }
    const row = latest.rows[0];
    if (row.plan_version == null) {
      throw new SapIngestError(404, `No plan for ${parsed.lineId}`);
    }
    if (row.status !== 'PROPOSED') {
      throw new SapIngestError(409, 'No proposed plan to accept');
    }
    const { rows } = await queryOpenQueue(
      'SELECT gold.accept_plan($1, $2, CURRENT_USER, $3) AS result',
      [parsed.lineId, parsed.planVersion ?? row.plan_version, parsed.comment],
    );
    return rows[0].result;
  } catch (err) {
    throw mapPgError(err);
  }
}

/**
 * A copilot rush is an instruction, not only a lower rank. Priority 1 on an order that is
 * already 1 would otherwise be stored as a normal change and the plan would not move.
 */
async function flagLatestChangeAsRush(po) {
  await queryOpenQueue(
    `WITH latest AS (
       SELECT c.ingest_event_id
       FROM silver.process_order_change c
       JOIN silver.process_order po ON po.process_order_id = c.process_order_id
       WHERE po.po_number = $1
       ORDER BY c.ingest_event_id DESC
       LIMIT 1
     ),
     marked AS (
       UPDATE silver.process_order_change c
       SET is_rush = true
       FROM latest
       WHERE c.ingest_event_id = latest.ingest_event_id
       RETURNING c.ingest_event_id
     )
     UPDATE raw.ingest_event e
     SET payload = e.payload || jsonb_build_object('rush', true)
     FROM marked
     WHERE e.ingest_event_id = marked.ingest_event_id`,
    [po],
  );
}

/** Urgency on a lot already in the open queue. Writes raw.ingest_event and silver.process_order_change, then replans. */
export async function recordPriorityChange(body) {
  const parsed = parsePriorityChange(body);
  let result;
  try {
    const { rows } = await queryOpenQueue(
      'SELECT gold.ingest_sap_priority_change($1, $2, $3, $4) AS result',
      [parsed.lineId, parsed.po, parsed.priority, parsed.scheduledFinish],
    );
    result = rows[0].result;
  } catch (err) {
    throw mapPgError(err);
  }
  if (parsed.rush) await flagLatestChangeAsRush(parsed.po);
  return withSemanticPlan(
    queryOpenQueue,
    {
      lineId: parsed.lineId,
      kind: parsed.rush || result?.eventType === 'rush' ? 'rush' : 'priority_change',
      po: parsed.po,
      shipBy: parsed.scheduledFinish,
    },
    () => explainOrPlan(result, {
      locale: localeOf(body.locale),
      focusPo: parsed.po,
      priority: parsed.priority,
      scheduledFinish: parsed.scheduledFinish,
    }),
  );
}

/**
 * New active PO from a COISPI refresh, then a recommended plan for that line.
 * Inserts the order and schedule row, records a queue_refresh plan event, and calls gold.replan.
 */
export async function insertCoispiPo(body) {
  const parsed = parseNewPo(body);
  const scheduleCsv = `${parsed.lineId.replace('-', '_')}_schedule.csv`;

  return withOpenQueueClient(async (client) => {
    try {
      await client.query('BEGIN');
      const existing = await client.query(
        'SELECT process_order_id FROM silver.process_order WHERE po_number = $1',
        [parsed.po],
      );
      if (existing.rowCount) {
        throw new SapIngestError(409, `PO ${parsed.po} already exists`);
      }

      const wc = await client.query(
        'SELECT work_center_id FROM silver.work_center WHERE demo_line_id = $1',
        [parsed.lineId],
      );
      if (!wc.rowCount) {
        throw new SapIngestError(404, `Unknown line ${parsed.lineId}`);
      }

      const species = await client.query(
        'SELECT species_id FROM silver.species WHERE species_code = $1',
        [parsed.species],
      );
      if (!species.rowCount) {
        throw new SapIngestError(400, `Unknown species ${parsed.species}`);
      }

      const poIns = await client.query(
        `INSERT INTO silver.process_order (
           po_number, po_type, species_id, work_center_id, is_in_sap, sap_status,
           planned_output_qty, uom_code, sap_finish_date, priority_rank,
           source_csv, source_row_number
         )
         VALUES (
           $1, 'PRODUCTION', $2, $3, true, 'NEW',
           $4, 'KG', $5::date, $6,
           'excel_sap_data.csv',
           (SELECT coalesce(max(source_row_number), 0) + 1
              FROM silver.process_order WHERE source_csv = 'excel_sap_data.csv')
         )
         RETURNING process_order_id`,
        [
          parsed.po,
          species.rows[0].species_id,
          wc.rows[0].work_center_id,
          parsed.kg,
          parsed.scheduledFinish,
          parsed.priority,
        ],
      );

      await client.query(
        `INSERT INTO silver.line_schedule_item (
           process_order_id, po_number_raw, po_number_status, work_center_id,
           species_code, status_code, priority_rank, scheduled_finish_date,
           input_kg, uom_code, trait_family_code, source_csv, source_row_number
         )
         VALUES (
           $1, $2, 'VALID', $3,
           $4, 'NEW', $5, $6::date,
           $7, 'KG', 'NONE', $8,
           (SELECT coalesce(max(source_row_number), 0) + 1
              FROM silver.line_schedule_item WHERE source_csv = $8)
         )
         RETURNING line_schedule_item_id`,
        [
          poIns.rows[0].process_order_id,
          parsed.po,
          wc.rows[0].work_center_id,
          parsed.species,
          parsed.priority,
          parsed.scheduledFinish,
          parsed.kg,
          scheduleCsv,
        ],
      );

      const event = await client.query(
        `INSERT INTO gold.plan_event (work_center_id, event_type, source, process_order_id, payload)
         VALUES ($1, 'queue_refresh', 'etl_refresh', $2, $3::jsonb)
         RETURNING plan_event_id`,
        [
          wc.rows[0].work_center_id,
          poIns.rows[0].process_order_id,
          JSON.stringify({
            lineId: parsed.lineId,
            po: parsed.po,
            species: parsed.species,
            kg: parsed.kg,
            priority: parsed.priority,
            scheduledFinish: parsed.scheduledFinish,
          }),
        ],
      );

      const plan = await client.query('SELECT gold.replan($1, $2) AS plan_id', [
        parsed.lineId,
        event.rows[0].plan_event_id,
      ]);
      const response = await client.query('SELECT gold.event_response($1) AS result', [
        plan.rows[0].plan_id,
      ]);

      await client.query('COMMIT');
      return response.rows[0].result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw mapPgError(err);
    }
  }).then((result) => withSemanticPlan(
    queryOpenQueue,
    { lineId: parsed.lineId, kind: 'queue_refresh', po: parsed.po },
    () => explainOrPlan(result, {
      locale: localeOf(body.locale),
      focusPo: parsed.po,
      priority: parsed.priority,
      scheduledFinish: parsed.scheduledFinish,
    }),
  ));
}
