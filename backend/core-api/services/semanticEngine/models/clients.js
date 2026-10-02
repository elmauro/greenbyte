const JEV_MODEL = 'typesafe/jev-1.13';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

export function jevEnabled() {
  return process.env.JEV_ENABLED === 'true' && Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function bedrockEnabled() {
  return process.env.BEDROCK_ENABLED === 'true';
}

const JEV_QUESTIONS = {
  fact_type: {
    type: 'choice',
    instructions: {
      question: 'What does this seed-plant scheduler note say about running the process order?',
      glossary: 'Notes are terse shop-floor shorthand. RDY = ready, RAW = raw seed, fumi = fumigation, germ = germination test, INT = internal, Ln1/Ln2/L2A = line.',
    },
    criteria: {
      NOT_READY: 'The order cannot run yet: fumigation not done, waiting for a germination result, or material not available.',
      HOLD: 'The order is explicitly on hold or blocked.',
      RELEASE: 'A previous blocker is cleared: fumigated, released, approved.',
      RUSH: 'The order must be expedited or run first.',
      DEADLINE: 'The note gives a ship-by or due date.',
      INFO: 'Routing, rework, staffing or descriptive detail with no effect on when the order can run.',
    },
  },
  not_ready_reason: {
    type: 'choice',
    instructions: 'If the order is not ready, what is it waiting for?',
    criteria: {
      FUMIGATION: 'Fumigation is pending or not done.',
      RAW_GERM_PENDING: 'Waiting for a raw germination test result.',
      OTHER: 'Something else, or the note does not say it is waiting.',
    },
  },
};

export function createJevClassifier(fetchImpl = fetch) {
  return async function classify(text) {
    const response = await fetchImpl('https://openrouter.ai/api/alpha/decisions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-OpenRouter-Title': 'GreenByte',
      },
      body: JSON.stringify({ model: JEV_MODEL, state: { note: text }, questions: JEV_QUESTIONS }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`JEV ${response.status}`);
    const { answers = {}, model } = await response.json();
    const factType = answers.fact_type?.choice;
    const reason = answers.not_ready_reason?.choice;
    return {
      fact_type: factType,
      fact_value: factType === 'NOT_READY' && reason && reason !== 'OTHER' ? { reason } : {},
      applies_to: 'PO',
      confidence: answers.fact_type?.confidence,
      modelId: model || JEV_MODEL,
    };
  };
}

export function createBedrockComplete(send) {
  return async function complete(prompt) {
    const response = await send({
      modelId: BEDROCK_MODEL,
      system: [{ text: 'You write short planner explanations. Reply with JSON only.' }],
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { temperature: 0, maxTokens: 400 },
    });
    return response.output.message.content.map((block) => block.text).join('');
  };
}

export async function explainClients() {
  if (!bedrockEnabled()) return {};
  const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
  return {
    complete: createBedrockComplete((input) => client.send(new ConverseCommand(input), {
      abortSignal: AbortSignal.timeout(8000),
    })),
  };
}
