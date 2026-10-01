import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { dataReplanRequestFromSapQueueRefresh } from '../../services/plantDemo/ingestToDataReplan.js';
import { isOpenQueueDbConfigured } from '../../services/plantDemo/openQueueDb.js';
import { runPlantEvent } from '../../services/plantDemo/runEvent.js';
import { insertCoispiPo, SapIngestError } from '../../services/plantDemo/sapIngestDb.js';

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) {
    return jsonResponse(400, { message: 'Invalid JSON body' });
  }

  const lineId = body.lineId ?? PLANT_DEMO_LINE_ID;
  const po = body.po;
  if (!po || typeof po !== 'string') {
    return jsonResponse(400, { message: 'po required (new or existing active PO)' });
  }

  try {
    if (isOpenQueueDbConfigured()) {
      const result = await insertCoispiPo({ ...body, lineId, po });
      return jsonResponse(200, result);
    }

    const replanRequest = dataReplanRequestFromSapQueueRefresh({ ...body, lineId, po });
    const response = await runPlantEvent(replanRequest, 'sap_queue_refresh');
    return jsonResponse(200, response);
  } catch (err) {
    if (err instanceof SapIngestError) {
      return jsonResponse(err.status, { message: err.message });
    }
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-ingest-sap-refresh', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
