import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { dataReplanRequestFromPassFailIngest } from '../../services/plantDemo/ingestToDataReplan.js';
import { isOpenQueueDbConfigured } from '../../services/plantDemo/openQueueDb.js';
import { runPlantEvent } from '../../services/plantDemo/runEvent.js';
import { recordPassFail, SapIngestError } from '../../services/plantDemo/sapIngestDb.js';
import { loadState } from '../../services/plantDemo/stateRepository.js';

const DEFAULT_FAIL_PO = '1001884747';

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
  const passFail = body.passFail ?? body.pass_fail;
  const po = body.po ?? DEFAULT_FAIL_PO;

  if (passFail !== 'Fail') {
    return jsonResponse(400, { message: 'Only passFail Fail triggers replan in demo ingest' });
  }

  try {
    if (isOpenQueueDbConfigured()) {
      const result = await recordPassFail({ ...body, lineId, po, passFail });
      return jsonResponse(200, result);
    }

    const state = await loadState(lineId);
    const row = state.queue.find((r) => r.po === po);
    if (!row || row.status === 'COMPLETE') {
      return jsonResponse(400, {
        message: `PO ${po} is not in the active queue for line ${lineId}`,
      });
    }

    const replanRequest = dataReplanRequestFromPassFailIngest({ ...body, lineId, locale, po });
    const response = await runPlantEvent(replanRequest, 'pass_fail_log');
    return jsonResponse(200, response);
  } catch (err) {
    if (err instanceof SapIngestError) {
      return jsonResponse(err.status, { message: err.message });
    }
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-ingest-pass-fail', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
