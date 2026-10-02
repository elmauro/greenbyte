import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { isOpenQueueDbConfigured, queryOpenQueue } from '../../services/plantDemo/openQueueDb.js';
import { planMorningLine, stageRawLine } from '../../services/plantDemo/morningDemo.js';
import { SapIngestError } from '../../services/plantDemo/sapIngestDb.js';

function lineIdOf(body) {
  return body?.lineId === 'line-1' || body?.lineId === 'line-2' ? body.lineId : null;
}

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) return jsonResponse(400, { message: 'Invalid JSON body' });
  const lineId = lineIdOf(body);
  if (!lineId) return jsonResponse(400, { message: 'lineId must be line-1 or line-2' });
  if (!isOpenQueueDbConfigured()) return jsonResponse(503, { message: 'Database is not configured' });

  const path = event.rawPath || event.requestContext?.http?.path || '';
  try {
    if (path.endsWith('/plan-line')) {
      const plan = await planMorningLine(queryOpenQueue, lineId);
      return jsonResponse(200, {
        lineId,
        planVersion: plan.planVersion,
        queue: plan.queue,
        explanation: plan.explanation,
      });
    }
    return jsonResponse(200, await stageRawLine(lineId));
  } catch (err) {
    if (err instanceof SapIngestError) return jsonResponse(err.status, { message: err.message });
    console.error('plant-demo-morning', err);
    return jsonResponse(500, { message: err.message || 'Internal error' });
  }
}
