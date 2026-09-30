import { jsonResponse } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { getQueueResponse } from '../../services/plantDemo/logic.js';
import { fetchOpenQueue, isOpenQueueDbConfigured } from '../../services/plantDemo/openQueueDb.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

export async function handler(event) {
  const lineId = event.pathParameters?.lineId;
  if (!lineId) {
    return jsonResponse(400, { message: 'lineId required' });
  }

  try {
    if (isOpenQueueDbConfigured()) {
      const queue = await fetchOpenQueue(lineId);
      if (lineId === PLANT_DEMO_LINE_ID) {
        const state = await loadState(lineId);
        const current = getQueueResponse(state, lineId);
        if (current.lastEvent) {
          return jsonResponse(200, current);
        }
        return jsonResponse(200, { ...current, queue });
      }
      return jsonResponse(200, {
        lineId,
        queue,
        planVersion: 1,
        lastEvent: null,
        acceptedPlanVersion: null,
        pendingExplanation: null,
        pendingDiff: null,
      });
    }

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
