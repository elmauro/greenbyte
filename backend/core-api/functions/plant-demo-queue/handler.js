import { jsonResponse } from '../../lib/httpResponse.js';
import { getQueueResponse } from '../../services/plantDemo/logic.js';
import { isOpenQueueDbConfigured } from '../../services/plantDemo/openQueueDb.js';
import { localeOf } from '../../services/plantDemo/planExplanation.js';
import { fetchSchedulerQueue } from '../../services/plantDemo/sapIngestDb.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

export async function handler(event) {
  const lineId = event.pathParameters?.lineId;
  if (!lineId) {
    return jsonResponse(400, { message: 'lineId required' });
  }

  try {
    if (isOpenQueueDbConfigured()) {
      const locale = localeOf(event.queryStringParameters?.locale);
      const response = await fetchSchedulerQueue(lineId, locale);
      return jsonResponse(200, response);
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
