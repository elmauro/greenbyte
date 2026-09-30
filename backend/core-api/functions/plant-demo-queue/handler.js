import { jsonResponse } from '../../lib/httpResponse.js';
import { getQueueResponse } from '../../services/plantDemo/logic.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

export async function handler(event) {
  const lineId = event.pathParameters?.lineId;
  if (!lineId) {
    return jsonResponse(400, { message: 'lineId required' });
  }

  try {
    const state = await loadState(lineId);
    return jsonResponse(200, getQueueResponse(state, lineId));
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-queue', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
