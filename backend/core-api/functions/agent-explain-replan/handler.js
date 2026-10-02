import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { explainPlan } from '../../services/semanticEngine/explain/explainPlan.js';
import { explainClients } from '../../services/semanticEngine/models/clients.js';

function packetOf(body) {
  if (body.payload) return { lineId: body.lineId, diff: body.diff, ...body.payload };
  if (body.entries || body.impact) return body;
  if (Array.isArray(body.queueSnapshot)) {
    return {
      lineId: body.lineId,
      diff: body.diff,
      entries: body.queueSnapshot.map((row, index) => ({ poNumber: String(row.po), position: index + 1 })),
      impact: { newlyLate: body.queueSnapshot.filter((row) => row.atRisk).map((row) => String(row.po)) },
    };
  }
  return null;
}

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) return jsonResponse(400, { message: 'Invalid JSON body' });
  const packet = packetOf(body);
  if (!packet) return jsonResponse(400, { message: 'payload, entries, or queueSnapshot required' });

  try {
    const { explanation, source } = await explainPlan(packet, await explainClients());
    return jsonResponse(200, { ...explanation, source });
  } catch (err) {
    console.error('agent-explain-replan', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
