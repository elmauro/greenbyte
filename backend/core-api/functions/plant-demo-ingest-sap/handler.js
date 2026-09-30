import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { runPlantEvent } from '../../services/plantDemo/runEvent.js';

const DEMO_RUSH_PO = '1002307551';

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
  const po = body.po ?? DEMO_RUSH_PO;

  if (po !== DEMO_RUSH_PO) {
    return jsonResponse(400, {
      message: `Demo ingest supports priority replan for PO ${DEMO_RUSH_PO}. Received: ${po}`,
    });
  }

  try {
    const response = await runPlantEvent(lineId, 'rush', locale, 'sap_priority_change');
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-ingest-sap', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
