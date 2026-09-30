import { postExplainReplan } from './agentApiClient.js';
import { postScheduleReplan } from './dataApiClient.js';
import { loadState, saveState } from './stateRepository.js';

/**
 * BFF orchestration: Data API replan → Agent explain → persist for GET queue poll.
 *
 * @param {object} replanRequest — Camilo `POST /schedule/replan` body (+ focusPo)
 * @param {string} bffSource — e.g. sap_priority_change | pass_fail_log | demo_inject_legacy
 */
export async function runPlantEvent(replanRequest, bffSource) {
  const { lineId, type, locale, focusPo, trigger, ingest } = replanRequest;
  const state = await loadState(lineId);

  const explainContext = {
    focusPo,
    failedFor: ingest?.failedFor,
    priority: ingest?.priority,
    scheduledFinish: ingest?.scheduledFinish,
    trigger,
    customerOrderId: ingest?.customerOrderId,
  };

  const dataResult = await postScheduleReplan({
    state,
    lineId,
    type,
    locale,
    focusPo,
    trigger,
    ingest,
    explainContext,
  });

  const explanation = await postExplainReplan({
    locale,
    lineId,
    eventType: type,
    diff: dataResult.diff,
    queue: dataResult.queue,
    planVersion: dataResult.planVersion,
    explainContext,
  });

  const nextState = {
    ...dataResult.state,
    pendingExplanation: explanation,
    pendingDiff: dataResult.diff,
  };

  await saveState(lineId, nextState);

  return {
    lineId,
    eventType: type,
    queue: dataResult.queue,
    planVersion: dataResult.planVersion,
    diff: dataResult.diff,
    explanation,
    source: bffSource,
  };
}
