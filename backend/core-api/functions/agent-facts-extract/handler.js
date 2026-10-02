import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { createJevClassifier, jevEnabled } from '../../services/semanticEngine/models/clients.js';
import { extractFacts } from '../../services/semanticEngine/notes/extractFacts.js';

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) return jsonResponse(400, { message: 'Invalid JSON body' });
  if (!Array.isArray(body.notes)) return jsonResponse(400, { message: 'notes required' });

  try {
    const clients = jevEnabled() ? { classify: createJevClassifier() } : {};
    const result = await extractFacts(body.notes, clients);
    return jsonResponse(200, result);
  } catch (err) {
    console.error('agent-facts-extract', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}
