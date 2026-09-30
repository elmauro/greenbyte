import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { applyEvent } from '../../services/plantDemo/logic.js';
import { loadState, saveState } from '../../services/plantDemo/stateRepository.js';

function parseLocale(body) {
  const loc = body?.locale;
  if (loc === 'es' || loc === 'en') return loc;
  return 'en';
}

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) {
    return jsonResponse(400, { message: 'Invalid JSON body' });
  }

  const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
  const locale = parseLocale(body);

  if (body.type !== 'rush' && body.type !== 'qa_fail') {
    return jsonResponse(400, { message: 'Invalid event type' });
  }

  try {
    const state = await loadState(lineId);
    const { state: nextState, response } = applyEvent(state, lineId, body.type, locale);
    await saveState(lineId, nextState);
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-events', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
