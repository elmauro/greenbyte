import { buildExplainReplan } from './explanationBuilder.js';
import { explainBatch } from './logic.js';
import { AGENT_API_PATHS } from './uc1ServiceRoutes.js';

function agentApiBaseUrl() {
  const url = process.env.AGENT_API_BASE_URL?.trim();
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
    throw new Error(`Agent API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * David · POST /explain-replan — NL summary grounded in structured diff (target: LLM + RAG).
 * Stub: template `PlantExplanation` from constants (swap for live Agent when URL is set).
 */
export async function postExplainReplan(params) {
  const { locale, eventType, diff, queue, planVersion, lineId, explainContext = {} } = params;
  const loc = locale === 'es' ? 'es' : 'en';
  const base = agentApiBaseUrl();

  const requestBody = {
    locale: loc,
    lineId,
    eventType,
    planVersion,
    diff,
    queueSnapshot: queue,
  };

  if (base) {
    return postJson(base, AGENT_API_PATHS.explainReplan, requestBody);
  }

  return buildExplainReplan(loc, eventType, {
    ...explainContext,
    lineId,
    moves: diff?.moves ?? [],
    added: diff?.added ?? [],
    held: diff?.held ?? [],
    queue: queue ?? [],
  });
}

/**
 * David · POST /batches/explain — sales batch Q&A (nice-to-have).
 * Stub: `logic.explainBatch` on the current demo queue until AGENT_API_BASE_URL is set.
 */
export async function postBatchExplain(params) {
  const { state, po, question, locale } = params;
  const loc = locale === 'es' ? 'es' : 'en';
  const base = agentApiBaseUrl();

  const requestBody = {
    po,
    question,
    locale: loc,
    lineId: state.lineId,
    planVersion: state.planVersion,
  };

  if (base) {
    return postJson(base, AGENT_API_PATHS.batchExplain, requestBody);
  }

  return explainBatch(state, po, question, loc);
}

export function isAgentApiLive() {
  return agentApiBaseUrl() != null;
}
