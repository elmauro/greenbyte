import { applyEvent, applySapQueueRefresh } from './logic.js';
import { DATA_API_PATHS } from './uc1ServiceRoutes.js';

function dataApiBaseUrl() {
  const url = process.env.DATA_API_BASE_URL?.trim();
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

async function postJson(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Data API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getJson(baseUrl, path) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Data API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Camilo · GET /lines/{lineId}/queue — queue snapshot from PostgreSQL (target).
 * Stub: returns queue + planVersion from BFF demo state (Dynamo).
 *
 * @param {import('./logic.js').PlantDemoState} state
 * @param {string} lineId
 */
export async function getLineQueue(state, lineId) {
  const base = dataApiBaseUrl();
  if (base) {
    return getJson(base, DATA_API_PATHS.lineQueue(lineId));
  }
  return {
    lineId,
    planVersion: state.planVersion,
    queue: state.queue,
  };
}

/**
 * Camilo · POST /schedule/replan — heuristic replan after upstream signal.
 * Stub: Pasco rules in `logic.applyEvent` (same as MSW / plantDemoServer).
 *
 * @param {object} params
 * @param {import('./logic.js').PlantDemoState} params.state
 * @param {string} params.lineId
 * @param {'rush' | 'qa_fail'} params.type
 * @param {'en' | 'es'} params.locale
 * @param {string} [params.focusPo]
 * @param {string} [params.trigger]
 * @param {object} [params.ingest]
 */
export async function postScheduleReplan(params) {
  const { state, lineId, type, locale, focusPo, trigger, ingest, explainContext } = params;
  const base = dataApiBaseUrl();

  const requestBody = {
    type,
    lineId,
    locale,
    focusPo,
    trigger,
    ingest,
  };

  if (base) {
    const path =
      trigger === 'sap_queue_refresh'
        ? DATA_API_PATHS.scheduleRefreshFromSap
        : DATA_API_PATHS.scheduleReplan;
    const data = await postJson(base, path, requestBody);
    const nextState = {
      ...state,
      lineId,
      queue: data.queue,
      planVersion: data.planVersion,
      lastEvent: type,
      acceptedPlanVersion: null,
      pendingExplanation: null,
      pendingDiff: null,
    };
    return {
      state: nextState,
      queue: data.queue,
      planVersion: data.planVersion,
      diff: data.diff,
      eventType: type,
    };
  }

  const eventOptions = {
    focusPo,
    failedFor: ingest?.failedFor ?? explainContext?.failedFor,
    priority: ingest?.priority ?? explainContext?.priority,
    scheduledFinish: ingest?.scheduledFinish ?? explainContext?.scheduledFinish,
    trigger,
    species: ingest?.species,
    kg: ingest?.kg,
    finish: ingest?.finish,
    customerOrderId: ingest?.customerOrderId,
  };

  const { state: replanState, response } =
    trigger === 'sap_queue_refresh'
      ? applySapQueueRefresh(state, lineId, locale, { po: focusPo, ...eventOptions })
      : applyEvent(state, lineId, type, locale, eventOptions);
  const stateWithoutAgent = {
    ...replanState,
    pendingExplanation: null,
    pendingDiff: null,
  };
  return {
    state: stateWithoutAgent,
    queue: response.queue,
    planVersion: response.planVersion,
    diff: response.diff,
    eventType: type,
  };
}

export function isDataApiLive() {
  return dataApiBaseUrl() != null;
}
