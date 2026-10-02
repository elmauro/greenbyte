import { jsonResponse, parseJsonBody } from '../../lib/httpResponse.js';
import { explainPlan } from '../../services/semanticEngine/explain/explainPlan.js';
import { bedrockEnabled, createBedrockComplete } from '../../services/semanticEngine/models/clients.js';

export async function handler(event) {
  const body = parseJsonBody(event);
  if (body === null) return jsonResponse(400, { message: 'Invalid JSON body' });
  if (!body.entries && !body.impact && !body.payload) {
    return jsonResponse(400, { message: 'entries or impact required' });
  }

  try {
    const packet = body.payload || body;
    const clients = bedrockEnabled() ? { complete: await bedrockComplete() } : {};
    const result = await explainPlan(packet, clients);
    return jsonResponse(200, result);
  } catch (err) {
    console.error('agent-explain-replan', err);
    return jsonResponse(500, { message: 'Internal error' });
  }
}

async function bedrockComplete() {
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  return createBedrockComplete((input) => client.send(new ConverseCommand(input)));
}
