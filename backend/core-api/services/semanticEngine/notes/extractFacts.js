import { factStatus, rulesFacts, withReadyBy } from './rules.js';

const PROMPT_VERSION = 'facts-v1';
const JEV_MODEL = 'typesafe/jev-1.13';
const FACT_TYPES = ['NOT_READY', 'HOLD', 'RELEASE', 'RUSH', 'DEADLINE', 'INFO'];

function infoFact() {
  return { fact_type: 'INFO', fact_value: {}, applies_to: 'UNKNOWN', confidence: 0.5 };
}

function reading(note, facts, modelId, reader) {
  const floor = note.minConfidence ?? 0.7;
  return {
    po: note.po ?? null,
    sourceRef: note.sourceRef ?? null,
    text: note.text,
    reader,
    modelId,
    promptVersion: PROMPT_VERSION,
    facts: facts.map((fact) => ({ ...fact, status: factStatus(fact.confidence, floor) })),
  };
}

async function classify(note, clients) {
  const ruled = withReadyBy(rulesFacts(note.text), note.asOf);
  const floor = note.minConfidence ?? 0.7;
  const strong = ruled.some((fact) => fact.confidence >= floor);
  if (strong || !clients.classify) {
    return reading(note, ruled.length ? ruled : [infoFact()], 'rules-v1', 'RULE');
  }
  try {
    const guessed = await clients.classify(note.text);
    const factType = FACT_TYPES.includes(guessed?.fact_type) ? guessed.fact_type : 'INFO';
    const facts = withReadyBy([{
      fact_type: factType,
      fact_value: guessed?.fact_value || {},
      applies_to: guessed?.applies_to || 'PO',
      confidence: Number(guessed?.confidence ?? 0.8),
    }], note.asOf);
    return reading(note, facts, guessed?.modelId || JEV_MODEL, 'BEDROCK');
  } catch {
    return reading(note, ruled.length ? ruled : [infoFact()], 'rules-v1', 'RULE');
  }
}

export async function extractFacts(notes, clients = {}) {
  const readings = [];
  for (const note of notes || []) readings.push(await classify(note, clients));
  return { promptVersion: PROMPT_VERSION, notes: readings };
}

export { JEV_MODEL, PROMPT_VERSION };
