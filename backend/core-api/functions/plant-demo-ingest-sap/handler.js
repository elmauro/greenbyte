import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { dataReplanRequestFromSapIngest } from '../../services/plantDemo/ingestToDataReplan.js';
import { runPlantEvent } from '../../services/plantDemo/runEvent.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

const DEFAULT_RUSH_PO = '1002307551';

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
  const po = body.po ?? DEFAULT_RUSH_PO;

  try {
    const state = await loadState(lineId);
    const inQueue = state.queue.some((r) => r.po === po && r.status !== 'COMPLETE');
    if (!inQueue) {
      return jsonResponse(400, {
        message: `PO ${po} is not in the active queue for line ${lineId}`,
      });
    }

    const replanRequest = dataReplanRequestFromSapIngest({ ...body, lineId, locale, po });
    const response = await runPlantEvent(replanRequest, 'sap_priority_change');
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-ingest-sap', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
