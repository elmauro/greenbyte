import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { explainBatch } from '../../services/plantDemo/logic.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

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

  const locale = parseLocale(body);
  if (!body.po || !body.question) {
    return jsonResponse(400, { message: 'po and question required' });
  }

  try {
    const state = await loadState(PLANT_DEMO_LINE_ID);
    const response = explainBatch(state, body.po, body.question, locale);
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown batch') {
      return jsonResponse(404, { message: 'Unknown batch' });
    }
    console.error('plant-demo-explain', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
