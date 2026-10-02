import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { postBatchExplain } from '../../services/plantDemo/agentApiClient.js';
import { isOpenQueueDbConfigured, queryOpenQueue } from '../../services/plantDemo/openQueueDb.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';
import { explainBatchFromDb } from '../../services/semanticEngine/explain/explainBatch.js';
import { explainClients, createJevQuestionRouter, jevEnabled } from '../../services/semanticEngine/models/clients.js';

function parseLocale(body) {
  return body?.locale === 'es' ? 'es' : 'en';
}

function lineIdOf(value) {
  return value === 'line-1' || value === 'line-2' ? value : PLANT_DEMO_LINE_ID;
}

function historyOf(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-4).flatMap((turn) => {
    if (!turn || (turn.role !== 'user' && turn.role !== 'copilot') || typeof turn.text !== 'string') return [];
    return [{ role: turn.role, text: turn.text.slice(0, 500) }];
  });
}

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) {
    return jsonResponse(400, { message: 'Invalid JSON body' });
  }
  if (!body.po || !body.question) {
    return jsonResponse(400, { message: 'po and question required' });
  }

  const locale = parseLocale(body);
  try {
    if (isOpenQueueDbConfigured()) {
      const clients = {};
      if (jevEnabled()) clients.classify = createJevQuestionRouter();
      const { complete } = await explainClients();
      if (complete) clients.complete = complete;
      const result = await explainBatchFromDb(queryOpenQueue, {
        lineId: lineIdOf(body.lineId),
        po: String(body.po),
        question: String(body.question),
        locale,
        history: historyOf(body.history),
      }, clients);
      return jsonResponse(200, {
        po: result.po,
        answer: result.answer,
        citations: result.citations,
        suggestedFollowUps: result.suggestedFollowUps,
        ...(result.action ? { action: result.action } : {}),
      });
    }

    const state = await loadState(lineIdOf(body.lineId));
    const response = await postBatchExplain({
      state,
      po: body.po,
      question: body.question,
      locale,
    });
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown batch' || err.status === 404) {
      return jsonResponse(404, { message: 'Unknown batch' });
    }
    console.error('plant-demo-explain', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
