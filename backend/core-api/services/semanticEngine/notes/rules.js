function normalize(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toUpperCase();
}

const RULES = [
  { code: 'FUMI_NOT_DONE', fact_type: 'NOT_READY', fact_value: { reason: 'FUMIGATION' }, confidence: 0.9, test: (text) => /\bNOT FUMI/.test(text) || /\bNEEDS FUMI/.test(text) },
  { code: 'FUMI_PENDING', fact_type: 'NOT_READY', fact_value: { reason: 'FUMIGATION', conditional: true }, confidence: 0.6, test: (text) => /\bONCE FUMIGATED\b/.test(text) },
  { code: 'FUMI_DONE', fact_type: 'RELEASE', fact_value: { reason: 'FUMIGATION' }, confidence: 0.9, test: (text) => /^FUMIGATED\b/.test(text) },
  { code: 'RAW_GERM_WAIT', fact_type: 'NOT_READY', fact_value: { reason: 'RAW_GERM_PENDING' }, confidence: 0.8, test: (text) => /\bWAIT FOR RAW GERM\b/.test(text) },
  { code: 'HOLD_TEXT', fact_type: 'HOLD', fact_value: {}, confidence: 0.8, test: (text) => /\bON HOLD\b/.test(text) || /^HOLD\b/.test(text) },
  { code: 'RUSH_TEXT', fact_type: 'RUSH', fact_value: {}, confidence: 0.85, test: (text) => /\bRUSH\b/.test(text) },
  { code: 'DEADLINE_TEXT', fact_type: 'DEADLINE', fact_value: {}, confidence: 0.75, test: (text) => /\bSHIP BY\b/.test(text) || /\bDUE\b/.test(text) },
  {
    code: 'ROUTING_HINT',
    fact_type: 'INFO',
    fact_value: {},
    confidence: 0.6,
    test: (text) => /^\*[0-9]+$/.test(text) || /\bVMEK\b/.test(text) || /\bHAND ?PICK/.test(text) || /^LINE [0-9]+ GRAVITY/.test(text) || /^PRIORITY\b/.test(text) || /\bQUALITY SAMPLES\b/.test(text) || /^SIZING\b/.test(text) || /^CONDITION/.test(text),
  },
];

export function rulesFacts(text) {
  const normalized = normalize(text);
  if (!normalized) return [];
  return RULES.filter((rule) => rule.test(normalized)).map((rule) => ({
    fact_type: rule.fact_type,
    fact_value: { ...rule.fact_value, rule: rule.code },
    applies_to: 'UNKNOWN',
    confidence: rule.confidence,
  }));
}

export function withReadyBy(facts, asOf) {
  const start = asOf ? new Date(asOf) : new Date();
  return facts.map((fact) => {
    const reason = fact.fact_value?.reason;
    if (fact.fact_type !== 'NOT_READY' || !reason || fact.fact_value.ready_by) return fact;
    const days = reason === 'FUMIGATION' ? 3 : reason === 'RAW_GERM_PENDING' ? 14 : null;
    if (days == null) return fact;
    const ready = new Date(start.getTime() + days * 24 * 3600 * 1000);
    return { ...fact, fact_value: { ...fact.fact_value, ready_by: ready.toISOString() } };
  });
}

export function factStatus(confidence, floor = 0.7) {
  return confidence >= floor ? 'AUTO' : 'NEEDS_CONFIRMATION';
}
