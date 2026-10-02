import { parseModelJson } from './explainPlan.js';

const PO_PATTERN = /\b\d{7,12}\b/g;
const INTENTS = ['WHY_WAITING', 'WHEN_FINISH', 'MOVE_UP', 'OTHER'];

function lineLabel(lineId) {
  const number = String(lineId || '').match(/(\d+)$/)?.[1];
  return number ? `Line ${number}` : 'the line';
}

/** Latest plan row for one PO, plus the note and the immediate neighbors. */
export function packetFromGold(context, detail, po) {
  const queue = Array.isArray(context?.queue) ? context.queue : [];
  const index = queue.findIndex((row) => String(row?.po) === String(po));
  if (index < 0) return null;
  const row = queue[index];
  const reasons = Array.isArray(row.reasons) ? row.reasons : [];
  const facts = (Array.isArray(context?.facts) ? context.facts : []).filter((fact) => String(fact.po) === String(po));
  const ahead = index > 0 ? queue[index - 1] : null;
  const behind = queue[index + 1] || null;
  const tests = Array.isArray(detail?.qualityTests) ? detail.qualityTests : [];
  const fail = tests.find((test) => test?.failReason || test?.result === 'FAIL');
  return {
    po: String(row.po),
    lineId: context.lineId,
    planVersion: context.planVersion,
    position: Number(row.position) || index + 1,
    queueLength: queue.length,
    status: row.status || 'PLANNED',
    species: row.species || '',
    variety: row.variety || '',
    kg: row.kg,
    finish: row.finish || '',
    dueDate: row.dueDate || null,
    atRisk: row.atRisk === true,
    reasonShort: row.reasonShort || '',
    reasons: reasons.map((reason) => ({ code: reason.code, text: reason.text || '' })),
    running: reasons.some((reason) => reason.code === 'ALREADY_RUNNING'),
    notes: facts.map((fact) => ({
      factId: fact.factId,
      type: fact.type,
      label: fact.label,
      note: fact.note,
    })),
    aheadCount: index,
    aheadPo: ahead?.po ? String(ahead.po) : null,
    aheadSpecies: ahead?.species || null,
    behindPo: behind?.po ? String(behind.po) : null,
    failReason: fail?.failReason || null,
  };
}

export function citableBatchPos(packet) {
  return new Set([packet.po, packet.aheadPo, packet.behindPo].filter(Boolean).map(String));
}

export function batchAnswerGuard(answer, packet) {
  const allowed = citableBatchPos(packet);
  const unknown = [...String(answer || '').matchAll(PO_PATTERN)].map((match) => match[0]).find((po) => !allowed.has(po));
  return unknown ? { ok: false, reason: `unknown po ${unknown}` } : { ok: true };
}

/** An instruction to rush the selected order. A question about moving it up is not one. */
export function rushCommand(question) {
  const text = String(question || '').trim().toLowerCase();
  if (!text || /[?¿]/.test(text)) return false;
  if (/\b(what|why|how|when|which|would|could|qué|por qué|cómo|cuándo|cuando)\b/.test(text)) return false;
  return /\brush\b|\bexpedite\b|\bmove (it|this) up\b|\brun (it|this) first\b|\b(subelo|súbelo|sube esto|adelantalo|adelántalo)\b|\bm[aá]rcalo rush\b|\bponlo de primero\b/.test(text);
}

/** Chip text when JEV is off or the call fails. A real JEV answer is kept, including OTHER. */
function intentFromQuestion(question) {
  const text = String(question || '').toLowerCase();
  if (/waiting|esperando|por qu[eé]|why\b|fumi|hold/.test(text)) return 'WHY_WAITING';
  if (/when|ship|finish|cu[aá]ndo|sale/.test(text)) return 'WHEN_FINISH';
  if (/move|ahead|subir|priority|prioridad/.test(text)) return 'MOVE_UP';
  return 'OTHER';
}

function noteClause(packet, locale) {
  const note = packet.notes.find((item) => item.note);
  if (!note) return '';
  return locale === 'es' ? ` La nota dice "${note.note}".` : ` The note says "${note.note}".`;
}

function citationsFor(packet) {
  const items = [`PO ${packet.po}`, `Position ${packet.position}`];
  if (packet.reasonShort) items.push(packet.reasonShort);
  const note = packet.notes.find((item) => item.note);
  if (note?.note && !packet.reasonShort?.includes(note.note)) {
    items.push(note.factId != null ? `Note "${note.note}" (fact ${note.factId})` : `Note "${note.note}"`);
  } else if (note?.factId != null) {
    items.push(`Fact ${note.factId}`);
  }
  return items.slice(0, 4);
}

function followUps(intent, locale) {
  const en = {
    WHY_WAITING: ['When does it ship?', 'What would move it up?'],
    WHEN_FINISH: ['Why is it waiting?', 'What would move it up?'],
    MOVE_UP: ['Why is it waiting?', 'When does it ship?'],
    OTHER: ['Why is it waiting?', 'When does it ship?'],
  };
  const es = {
    WHY_WAITING: ['¿Cuándo sale?', '¿Qué haría falta para subirlo?'],
    WHEN_FINISH: ['¿Por qué está esperando?', '¿Qué haría falta para subirlo?'],
    MOVE_UP: ['¿Por qué está esperando?', '¿Cuándo sale?'],
    OTHER: ['¿Por qué está esperando?', '¿Cuándo sale?'],
  };
  return (locale === 'es' ? es : en)[intent] || en.OTHER;
}

export function templateBatchAnswer(packet, intent, locale) {
  const es = locale === 'es';
  const line = lineLabel(packet.lineId);
  const note = noteClause(packet, locale);
  let answer;
  if (intent === 'WHY_WAITING' && packet.running) {
    answer = es
      ? `PO ${packet.po} sigue en la posición ${packet.position} de ${line} porque ya está corriendo.${note}`
      : `PO ${packet.po} stays at position ${packet.position} on ${line} because it is already running.${note}`;
  } else if (intent === 'WHY_WAITING') {
    const because = packet.reasonShort || (packet.failReason ? `QA fail (${packet.failReason})` : (packet.status === 'HOLD' ? (es ? 'está en hold' : 'it is on hold') : (es ? 'sigue el plan' : 'it follows the plan')));
    answer = es
      ? `PO ${packet.po} está en la posición ${packet.position} de ${line}. ${because}.${note}`
      : `PO ${packet.po} is at position ${packet.position} on ${line}. ${because}.${note}`;
  } else if (intent === 'WHEN_FINISH') {
    const ahead = packet.aheadCount === 0
      ? (es ? 'Nada corre antes.' : 'Nothing runs before it.')
      : (es ? `${packet.aheadCount} orden(es) van antes.` : `${packet.aheadCount} order(s) run first.`);
    answer = es
      ? `PO ${packet.po} (${packet.species}, ${packet.kg} kg) tiene fin programado ${packet.finish || 'sin fecha'}. Va en la posición ${packet.position} de ${packet.queueLength}. ${ahead}`
      : `PO ${packet.po} (${packet.species}, ${packet.kg} kg) is scheduled to finish ${packet.finish || 'with no finish time'}. It is position ${packet.position} of ${packet.queueLength}. ${ahead}`;
  } else if (intent === 'MOVE_UP') {
    const ahead = packet.aheadCount === 0
      ? (es ? ' No hay nada delante.' : ' Nothing is ahead of it.')
      : (packet.aheadPo ? (es ? ` La anterior es ${packet.aheadPo}.` : ` The one ahead is ${packet.aheadPo}.`) : '');
    answer = es
      ? `Para subir PO ${packet.po} el programador tiene que aceptar un rush.${ahead} Este chat no cambia el plan.`
      : `To move PO ${packet.po} up, the scheduler has to accept a rush.${ahead} This chat does not change the plan.`;
  } else {
    answer = es
      ? `PO ${packet.po} (${packet.species}) está en la posición ${packet.position} de ${line}. ${packet.reasonShort || 'En cola.'} Fin programado: ${packet.finish || 'sin fecha'}.`
      : `PO ${packet.po} (${packet.species}) is position ${packet.position} on ${line}. ${packet.reasonShort || 'In the queue.'} Scheduled finish: ${packet.finish || 'none'}.`;
  }
  return {
    po: packet.po,
    answer: answer.replace(/\s+\./g, '.').replace(/\.\./g, '.'),
    citations: citationsFor(packet),
    suggestedFollowUps: followUps(intent, locale),
    intent,
    source: 'template',
  };
}

function answerPrompt(packet, intent, question, history) {
  return [
    'Return JSON {"answer":"..."} only. One or two sentences a plant scheduler can read aloud.',
    `Intent: ${intent}.`,
    'Use only PO numbers, dates, and reasons from this packet. History resolves words like "it"; it is not a source of facts.',
    `Question: ${question}`,
    history?.length ? `History: ${JSON.stringify(history.slice(-4))}` : '',
    `Packet: ${JSON.stringify(packet)}`,
  ].filter(Boolean).join('\n');
}

export async function explainBatchQuestion({ packet, question, history, locale, classify, complete }) {
  let intent = null;
  if (classify) {
    try {
      const choice = await classify({ po: packet.po, question, history });
      if (INTENTS.includes(choice)) intent = choice;
    } catch (err) {
      console.warn('jev question route failed:', err.message);
    }
  }
  if (!intent) intent = intentFromQuestion(question);
  const template = templateBatchAnswer(packet, intent, locale);
  if (rushCommand(question)) {
    const es = locale === 'es';
    return {
      ...template,
      action: 'rush',
      answer: es
        ? `Rush enviado para PO ${packet.po}. El plan nuevo queda propuesto y hay que aceptarlo. Nada se escribe en SAP.`
        : `Rush sent for PO ${packet.po}. The new plan is proposed and waiting to be accepted. Nothing is written to SAP.`,
    };
  }
  if (!complete) return template;
  try {
    const raw = await complete(answerPrompt(packet, intent, question, history));
    const parsed = parseModelJson(raw);
    if (typeof parsed?.answer === 'string' && batchAnswerGuard(parsed.answer, packet).ok) {
      return { ...template, answer: parsed.answer, source: 'bedrock' };
    }
  } catch (err) {
    console.warn('batch explain model failed:', err.message);
  }
  return template;
}

export async function loadBatchPacket(query, { lineId, po, locale }) {
  const plan = await query(
    `SELECT sp.schedule_plan_id
     FROM silver.work_center wc
     JOIN gold.v_latest_plan sp ON sp.work_center_id = wc.work_center_id
     WHERE wc.demo_line_id = $1`,
    [lineId],
  );
  const planId = plan.rows[0]?.schedule_plan_id;
  if (planId == null) return null;
  const [context, detail] = await Promise.all([
    query('SELECT gold.agent_context($1, $2) AS ctx', [planId, locale === 'es' ? 'es' : 'en']),
    query('SELECT gold.batch_detail($1) AS detail', [po]),
  ]);
  return packetFromGold(context.rows[0]?.ctx, detail.rows[0]?.detail, po);
}

export async function explainBatchFromDb(query, input, clients = {}) {
  const packet = await loadBatchPacket(query, input);
  if (!packet) {
    const error = new Error('Unknown batch');
    error.status = 404;
    throw error;
  }
  return explainBatchQuestion({ ...input, packet, ...clients });
}
