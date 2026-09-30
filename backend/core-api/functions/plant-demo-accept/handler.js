import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { acceptPlan } from '../../services/plantDemo/logic.js';
import { loadState, saveState } from '../../services/plantDemo/stateRepository.js';

export async function handler(event) {
  const body = parseJsonBody(event) ?? {};
  const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;

  try {
    const state = await loadState(lineId);
    const { state: nextState, response } = acceptPlan(state, lineId);
    await saveState(lineId, nextState);
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-accept', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
