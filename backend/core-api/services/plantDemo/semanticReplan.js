import {
  loadSnapshot,
  PlannerNotReadyError,
  plannerPayloadForPlan,
  savePlan,
} from '../semanticEngine/db/goldGateway.js';
import { explainPlan, templateExplanation } from '../semanticEngine/explain/explainPlan.js';
import { explainClients } from '../semanticEngine/models/clients.js';
import { zonedTimeToUtc } from '../semanticEngine/planner/calendar.js';
import { applyPlannerEvent, computePlan } from '../semanticEngine/planner/index.js';
import { normalizePlanDiff, normalizePlanQueue } from './planExplanation.js';

export function semanticPlannerEnabled() {
  return process.env.SEMANTIC_PLANNER_ENABLED === 'true';
}

export function failReasonCode(value) {
  const code = String(value ?? '').toUpperCase().replace(/[^A-Z]/g, '');
  return code === 'OFFTYPE' ? 'OFF_TYPE' : code;
}

function endOfDay(date, timeZone) {
  if (!date) return null;
  const [year, month, day] = date.split('-').map(Number);
  return zonedTimeToUtc(year, month, day, 23, 59, timeZone).toISOString();
}

export function plannerResult(snapshot, change) {
  if (change.kind === 'qa_fail_finished') {
    return applyPlannerEvent(snapshot, { type: 'qa_fail', po: change.po, failReason: failReasonCode(change.failedFor) });
  }
  if (change.kind === 'rush') {
    return computePlan(snapshot, {
      eventType: 'rush',
      rush: { po: change.po, shipBy: endOfDay(change.shipBy, snapshot.rules.timeZone) },
    });
  }
  return computePlan(snapshot, { eventType: change.kind });
}

function packetFor(plan, payload) {
  return {
    lineId: plan.lineId,
    diff: plan.diff,
    event: payload.event ?? null,
    entries: payload.entries,
    impact: payload.impact,
    proposals: payload.proposals,
    violations: payload.violations,
    citablePos: (plan.queue || []).map((row) => String(row.po)),
  };
}

/**
 * Runs the semantic planner after a gold ingest, saves one plan per large-seed line,
 * and returns the focus line's event_response with the planner explanation.
 * @param {(text: string, params?: unknown[]) => Promise<{ rows: object[] }>} query
 * @param {{ lineId: string, kind: string, po?: string, shipBy?: string, failedFor?: string }} change
 */
export async function replanWithSemanticEngine(query, change) {
  const snapshot = await loadSnapshot(query);
  const result = plannerResult(snapshot, change);
  const trigger = change.kind === 'qa_fail_finished' ? 'qa_fail' : change.kind;
  const event = { kind: trigger, po: change.po ?? null, failedFor: change.failedFor ?? null };
  const payloads = Object.fromEntries(
    Object.entries(result.payloads).map(([lineId, payload]) => [
      lineId,
      lineId === change.lineId ? { ...payload, event } : payload,
    ]),
  );
  const saved = await savePlan(query, {
    payloads,
    eventType: trigger,
    focusPo: change.po,
    focusLineId: change.lineId,
    lineIds: change.onlyLine ? [change.lineId] : undefined,
  });
  const target = saved.find((row) => row.lineId === change.lineId) ?? saved[0];
  if (!target) throw new Error(`Planner produced no entries for ${change.lineId}`);
  const response = await query('SELECT gold.event_response($1) AS result', [target.schedulePlanId]);
  const plan = response.rows[0]?.result;
  const payload = payloads[target.lineId];
  const { explanation, source } = await explainPlan(packetFor(plan, payload), await explainClients());
  await query(
    `UPDATE gold.plan_event
     SET payload = payload || jsonb_build_object('explanation', $2::jsonb)
     WHERE plan_event_id = $1`,
    [target.planEventId, JSON.stringify(explanation)],
  );
  return {
    ...plan,
    eventType: trigger,
    queue: normalizePlanQueue(plan.queue),
    diff: normalizePlanDiff(plan.diff),
    explanation,
    explanationSource: source,
    impact: payload.impact,
    proposals: payload.proposals,
    violations: payload.violations,
  };
}

/** Planner first; the heuristic result already written by gold.ingest stays as the fallback. */
export async function withSemanticPlan(query, change, fallback) {
  if (!semanticPlannerEnabled()) return fallback();
  try {
    return await replanWithSemanticEngine(query, change);
  } catch (err) {
    if (err instanceof PlannerNotReadyError) console.warn('semantic planner skipped:', err.message);
    else console.error('semantic planner failed', err);
    return fallback();
  }
}

/**
 * Explanation and triggering event for a saved planner plan on the scheduler poll, without a model call.
 * gold stores the plan as 'planner_run'; the screen needs the original trigger (rush | qa_fail | queue_refresh).
 */
export async function plannerExplanationForPoll(query, schedulePlanId, plan) {
  const payload = await plannerPayloadForPlan(query, schedulePlanId);
  if (!payload) return { explanation: null, eventType: plan.eventType };
  return {
    explanation: payload.explanation ?? templateExplanation(packetFor(plan, payload)),
    eventType: payload.trigger ?? plan.eventType,
  };
}
