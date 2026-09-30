import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { createBaselineState, getQueueResponse } from '../../services/plantDemo/logic.js';
import { saveState } from '../../services/plantDemo/stateRepository.js';

export async function handler(event) {
  const body = parseJsonBody(event) ?? {};
  const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;

  try {
    const baseline = createBaselineState();
    await saveState(lineId, baseline);
    return jsonResponse(200, getQueueResponse(baseline, lineId));
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-reset', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
