import { parseModelJson } from './explainPlan.js';

const PO_PATTERN = /\b\d{7,12}\b/g;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const CHUNK = 4;
// API Gateway stops the request at 30s. 25s leaves the plan save and the reply a few seconds.
const NOTE_TIMEOUT_MS = 25000;

const SYSTEM = 'You explain a seed-plant production schedule to the scheduler who runs it. Reply with JSON only.';

function reasonParams(reason) {
  const params = { ...(reason.params || {}) };
  delete params.semantic_fact_id;
  return { code: reason.code, ...params };
}

/** One explainable record per scheduled order of a line: the plan entry plus the order and its trusted notes. */
export function entryPackets(entries, orders) {
  const byPo = new Map((orders || []).map((order) => [order.poNumber, order]));
  return (entries || []).map((entry) => {
    const order = byPo.get(entry.poNumber) || {};
    return {
      po: entry.poNumber,
      position: entry.position,
      status: entry.entryStatus,
      species: order.speciesCode ?? null,
      variety: order.varietyCode ?? null,
      kg: order.inputKg ?? null,
      priority: order.priorityRank ?? null,
      sapFinishDate: entry.dueDate ?? null,
      plannedStart: entry.plannedStartAt ?? null,
      plannedEnd: entry.plannedEndAt ?? null,
      readyBy: order.readyBy ? String(order.readyBy).slice(0, 10) : null,
      slackDays: entry.slackDays ?? null,
      isAtRisk: entry.isAtRisk === true,
      notes: (order.noteFacts || []).map((fact) => ({ text: fact.text, means: fact.type })),
      reasons: (entry.reasons || []).map(reasonParams),
    };
  });
}

export function poNoteGuard(note, allowedPos, known) {
  if (!note || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 500) {
    return { ok: false, reason: 'shape' };
  }
  const unknownPo = [...note.text.matchAll(PO_PATTERN)].map((match) => match[0]).find((po) => !allowedPos.has(po));
  if (unknownPo) return { ok: false, reason: `unknown po ${unknownPo}` };
  const unknownDate = [...note.text.matchAll(DATE_PATTERN)].map((match) => match[0]).find((date) => !known.includes(date));
  if (unknownDate) return { ok: false, reason: `unknown date ${unknownDate}` };
  return { ok: true };
}

function prompt(chunk) {
  return [
    'Write one comment for every order in ORDERS. The scheduler will read it aloud.',
    'Reply with one line per order and nothing else. Exact shape: <po> || <one or two sentences>',
    'Each comment ends with a period.',
    'Say why the order is in this position, or why it is on hold.',
    'When the order has a shop-floor note, say what that note means for the run.',
    'If you mention a finish, copy sapFinishDate or the date inside plannedEnd. Do not calculate a new date.',
    'Do not mention an order number that is not in ORDERS. Do not use double quotes.',
    `ORDERS: ${JSON.stringify(chunk)}`,
  ].join('\n');
}

function singlePrompt(packet) {
  return [
    `Write the comment for order ${packet.po} only.`,
    `Reply with exactly one line and nothing else: ${packet.po} || <one or two sentences ending with a period>`,
    'Say why it is in this position, or why it is on hold, and what its shop-floor note means when it has one.',
    'Do not mention any other order number.',
    'If you mention a finish, copy sapFinishDate or the date inside plannedEnd. Do not calculate a new date.',
    `ORDER: ${JSON.stringify(packet)}`,
  ].join('\n');
}

function ensureSentence(text) {
  let trimmed = String(text).trim().replace(/\s+/g, ' ');
  let previous;
  do {
    previous = trimmed;
    trimmed = trimmed.replace(/^["']+|["']+$/g, '').replace(/[,;]+$/g, '').trim();
  } while (trimmed !== previous);
  if (!trimmed) return '';
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** Accepts the line format, and a JSON {"notes":[...]} reply when the model ignores the format. */
export function notesFromReply(raw, wanted) {
  const notes = {};
  try {
    for (const note of parseModelJson(raw).notes || []) {
      const po = String(note?.po ?? '');
      if (wanted.has(po) && typeof note.text === 'string' && note.text.trim()) notes[po] = note.text.trim();
    }
  } catch {
    /* not JSON; the line scan below still applies */
  }
  for (const line of String(raw).split('\n')) {
    const cleaned = line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '');
    const match = cleaned.match(/(\d{7,12})\s*(?:\|\||:)\s*(.+)/);
    if (match && wanted.has(match[1]) && match[2].trim()) notes[match[1]] = match[2].trim();
  }
  return notes;
}

function keptNotes(raw, chunk, allowedPos, known) {
  const wanted = new Set(chunk.map((packet) => packet.po));
  const notes = {};
  for (const [po, text] of Object.entries(notesFromReply(raw, wanted))) {
    const sentence = ensureSentence(text);
    const guard = poNoteGuard({ text: sentence }, allowedPos, known);
    if (!guard.ok) {
      console.warn('po note dropped:', po, guard.reason);
      continue;
    }
    notes[po] = sentence;
  }
  return notes;
}

async function askChunk(chunk, allowedPos, known, complete) {
  const raw = await complete(prompt(chunk), { system: SYSTEM, maxTokens: 3000, timeoutMs: NOTE_TIMEOUT_MS });
  return keptNotes(raw, chunk, allowedPos, known);
}

async function askOne(packet, allowedPos, known, complete) {
  const raw = await complete(singlePrompt(packet), { system: SYSTEM, maxTokens: 3000, timeoutMs: NOTE_TIMEOUT_MS });
  return keptNotes(raw, [packet], allowedPos, known);
}

/** Fills any order the group reply skipped, including when the whole group came back empty. */
async function explainChunk(chunk, allowedPos, known, complete) {
  let notes = {};
  try {
    notes = await askChunk(chunk, allowedPos, known, complete);
  } catch (err) {
    console.warn('po notes chunk skipped:', err.message);
  }
  const missing = chunk.filter((packet) => !notes[packet.po]);
  if (!missing.length) return notes;
  const singles = await Promise.all(missing.map(async (packet) => {
    try {
      return await askOne(packet, allowedPos, known, complete);
    } catch (err) {
      console.warn('po note skipped:', packet.po, err.message);
      return {};
    }
  }));
  return Object.assign(notes, ...singles);
}

/**
 * Bedrock comment per scheduled order, keyed by PO. A group reply that skips orders is
 * followed by one call per missing order. A comment that still names an unknown order or
 * date is dropped; the gold reasonShort still shows.
 */
export async function explainEntries(packets, clients = {}) {
  if (!clients.complete || !packets.length) return { poNotes: {}, source: 'none' };
  const allowedPos = new Set(packets.flatMap((packet) => [
    packet.po,
    ...packet.reasons.map((reason) => reason.previous_po || reason.from_po).filter(Boolean),
  ].map(String)));
  const known = JSON.stringify(packets);
  const chunks = [];
  for (let index = 0; index < packets.length; index += CHUNK) chunks.push(packets.slice(index, index + CHUNK));
  const results = await Promise.all(chunks.map((chunk) => explainChunk(chunk, allowedPos, known, clients.complete)
    .catch((err) => {
      console.warn('po notes chunk skipped:', err.message);
      return {};
    })));
  return { poNotes: Object.assign({}, ...results), source: 'bedrock' };
}
