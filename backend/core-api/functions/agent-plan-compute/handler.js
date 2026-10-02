import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { loadSnapshot, planFromSnapshot, savePlan } from '../../services/semanticEngine/db/goldGateway.js';

async function database() {
  const db = await import('../../services/plantDemo/openQueueDb.js');
  return db;
}

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) return jsonResponse(400, { message: 'Invalid JSON body' });

  try {
    const snapshot = body.snapshot || (body.loadFromGold ? await loadSnapshotFromDb(body) : null);
    if (!snapshot) return jsonResponse(400, { message: 'snapshot or loadFromGold required' });
    const result = planFromSnapshot(snapshot, body.event || null);
    if (!body.save) return jsonResponse(200, result);
    const db = await database();
    if (!db.isOpenQueueDbConfigured()) return jsonResponse(400, { message: 'Database is not configured' });
    const saved = await savePlan((text, params) => db.queryOpenQueue(text, params), {
      payloads: result.payloads,
      eventType: body.event?.type,
    });
    return jsonResponse(200, { ...result, saved });
  } catch (err) {
    if (err.statusCode) return jsonResponse(err.statusCode, { message: err.message });
    console.error('agent-plan-compute', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}

async function loadSnapshotFromDb(body) {
  const db = await database();
  if (!db.isOpenQueueDbConfigured()) {
    const error = new Error('Database is not configured');
    error.statusCode = 400;
    throw error;
  }
  return loadSnapshot((text, params) => db.queryOpenQueue(text, params), { asOf: body.asOf, repairLineId: body.repairLineId });
}
