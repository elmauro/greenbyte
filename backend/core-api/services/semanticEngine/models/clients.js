const JEV_MODEL = 'typesafe/jev-1.13';
const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

export function jevEnabled() {
  return process.env.JEV_ENABLED === 'true' && Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export function bedrockEnabled() {
  return process.env.BEDROCK_ENABLED === 'true';
}

export function createJevClassifier(fetchImpl = fetch) {
  return async function classify(text) {
    const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: JEV_MODEL,
        temperature: 0,
        messages: [{
          role: 'user',
          content: `Classify this plant note as one fact type: NOT_READY, HOLD, RELEASE, RUSH, DEADLINE, INFO.\nNote: ${text}\nReply with JSON {"fact_type","confidence","applies_to"}.`,
        }],
      }),
    });
    if (!response.ok) throw new Error(`JEV ${response.status}`);
    const body = await response.json();
    const content = body.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1));
    return { ...parsed, modelId: JEV_MODEL };
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
