import { postExplainReplan } from './agentApiClient.js';
import { resolveExplainPo } from './explanationBuilder.js';

/**
 * Maps a gold.event_response payload onto the scheduler contract and the
 * simulated Agent call. The database event type stays on the ingest response.
 * The scheduler poll uses rush | qa_fail so the existing screen opens.
 */

export function localeOf(value) {
  return value === 'es' ? 'es' : 'en';
}

export function titleCaseToken(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function explainContextFromPlan(plan, overrides = {}) {
  const eventType = String(plan?.eventType ?? '').toLowerCase();
  const source = String(plan?.source ?? '').toLowerCase();
  const isQa = eventType === 'qa_fail';
  const isRefresh = eventType === 'queue_refresh' || source === 'etl_refresh';
  const added = Array.isArray(plan?.diff?.added) ? plan.diff.added : [];
  const held = Array.isArray(plan?.diff?.held) ? plan.diff.held : [];
  const focusPo = resolveExplainPo({
    focusPo: overrides.focusPo,
    added,
    held,
    moves: plan?.diff?.moves ?? [],
    queue: plan?.queue ?? [],
  });

  return {
    uiEventType: isQa ? 'qa_fail' : 'rush',
    agentEventType: isQa ? 'qa_fail' : 'rush',
    trigger: isRefresh ? 'sap_queue_refresh' : isQa ? 'pass_fail_log' : 'sap_priority_change',
    focusPo,
    failedFor: overrides.failedFor ?? null,
    priority: overrides.priority ?? null,
    scheduledFinish: overrides.scheduledFinish ?? null,
  };
}

export function normalizePlanQueue(queue, poNotes = {}) {
  if (!Array.isArray(queue)) return [];
  return queue
    .map((row) => {
      if (!row || row.po == null || row.po === '') return null;
      const status = String(row.status ?? 'PLANNED').toUpperCase() === 'HOLD' ? 'HOLD' : 'PLANNED';
      const kg = Number(row.kg);
      const previous = row.previousPosition;
      const out = {
        po: String(row.po),
        species: row.species != null ? String(row.species) : '',
        kg: Number.isFinite(kg) ? kg : 0,
        finish: row.finish != null ? String(row.finish) : '',
        status,
      };
      if (row.atRisk === true) out.atRisk = true;
      if (row.reasonShort) out.reasonShort = String(row.reasonShort);
      if (poNotes?.[out.po]) out.aiNote = String(poNotes[out.po]);
      if (previous != null && previous !== '' && Number.isFinite(Number(previous))) {
        out.previousPosition = Number(previous);
      }
      return out;
    })
    .filter(Boolean);
}

export function normalizePlanDiff(diff) {
  return {
    moves: Array.isArray(diff?.moves) ? diff.moves : [],
    reasons: Array.isArray(diff?.reasons) ? diff.reasons : [],
    held: Array.isArray(diff?.held) ? diff.held : [],
    added: Array.isArray(diff?.added) ? diff.added : [],
    removed: Array.isArray(diff?.removed) ? diff.removed : [],
  };
}

export function queueResponseFromPlan(plan, explanation, poNotes = {}) {
  const ctx = explainContextFromPlan(plan);
  return {
    lineId: plan.lineId,
    queue: normalizePlanQueue(plan.queue, poNotes),
    planVersion: Number(plan.planVersion) || 1,
    lastEvent: ctx.uiEventType,
    acceptedPlanVersion: null,
    pendingExplanation: explanation ?? null,
    pendingDiff: normalizePlanDiff(plan.diff),
  };
}

/**
 * @param {object} plan gold.event_response JSON
 * @param {object} context locale, focusPo, failedFor, priority, scheduledFinish
 */
export async function attachPlanExplanation(plan, context = {}) {
  const ctx = explainContextFromPlan(plan, context);
  const queue = normalizePlanQueue(plan.queue);
  const explanation = await postExplainReplan({
    locale: localeOf(context.locale),
    lineId: plan.lineId,
    eventType: ctx.agentEventType,
    diff: normalizePlanDiff(plan.diff),
    queue,
    planVersion: Number(plan.planVersion) || 1,
    explainContext: {
      focusPo: ctx.focusPo,
      failedFor: ctx.failedFor,
      priority: ctx.priority,
      scheduledFinish: ctx.scheduledFinish,
      trigger: ctx.trigger,
    },
  });
  return {
    ...plan,
    queue,
    diff: normalizePlanDiff(plan.diff),
    explanation,
  };
}
