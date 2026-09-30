import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { PLANT_DEMO_LINE_ID } from '../../services/plantDemo/constants.js';
import { runPlantEvent } from '../../services/plantDemo/runEvent.js';

const DEMO_FAIL_PO = '1001884747';

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
  const po = body.po ?? DEMO_FAIL_PO;

  if (passFail !== 'Fail') {
    return jsonResponse(400, { message: 'Only passFail Fail triggers replan in demo ingest' });
  }

  if (po !== DEMO_FAIL_PO) {
    return jsonResponse(400, {
      message: `Demo ingest supports PO ${DEMO_FAIL_PO} (Pasco Fail/Dent). Received: ${po}`,
    });
  }

  try {
    const response = await runPlantEvent(lineId, 'qa_fail', locale, 'pass_fail_log');
    return jsonResponse(200, response);
  } catch (err) {
    if (err.message === 'Unknown line') {
      return jsonResponse(404, { message: 'Unknown line' });
    }
    console.error('plant-demo-ingest-pass-fail', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
