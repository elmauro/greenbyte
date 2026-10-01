import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { acceptPlan } from '../../services/plantDemo/logic.js';
import { isOpenQueueDbConfigured } from '../../services/plantDemo/openQueueDb.js';
import { SapIngestError, acceptProposedPlan } from '../../services/plantDemo/sapIngestDb.js';
import { loadState, saveState } from '../../services/plantDemo/stateRepository.js';

async function clearDemoPending(lineId) {
  if (lineId !== PLANT_DEMO_LINE_ID) return;
  try {
    const state = await loadState(lineId);
    const { state: nextState } = acceptPlan(state, lineId);
    await saveState(lineId, nextState);
  } catch (err) {
    console.error('plant-demo-accept dynamo', err);
  }
}

export async function handler(event) {
  const body = parseJsonBody(event) ?? {};
  const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;

  try {
    if (isOpenQueueDbConfigured()) {
      const response = await acceptProposedPlan({ ...body, lineId });
      await clearDemoPending(lineId);
      return jsonResponse(200, response);
    }

    const state = await loadState(lineId);
    const { state: nextState, response } = acceptPlan(state, lineId);
    await saveState(lineId, nextState);
    return jsonResponse(200, response);
  } catch (err) {
    if (err instanceof SapIngestError) {
      return jsonResponse(err.status, { message: err.message });
    }
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-accept', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
