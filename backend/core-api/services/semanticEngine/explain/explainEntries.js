import { parseModelJson } from './explainPlan.js';

const PO_PATTERN = /\b\d{7,12}\b/g;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const CHUNK = 4;

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
    'For every order in ORDERS write one or two short, plain sentences the scheduler can read aloud:',
    '- why it sits at this position, or why it is on hold;',
    '- what its shop-floor note means for the run, in your own words, when it has one;',
    '- when it is planned to finish compared with its SAP finish date.',
    'Use only orders, numbers and dates that appear in ORDERS. Do not use double quotes.',
    'Reply with one line per order and nothing else, exactly: <po> || <sentences>',
    `ORDERS: ${JSON.stringify(chunk)}`,
  ].join('\n');
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
    const match = line.match(/(\d{7,12})\s*\|\|\s*(.+)/);
    if (match && wanted.has(match[1]) && match[2].trim()) notes[match[1]] = match[2].trim();
  }
  return notes;
}

async function askChunk(chunk, allowedPos, known, complete) {
  const raw = await complete(prompt(chunk), { system: SYSTEM, maxTokens: 3000, timeoutMs: 20000 });
  const wanted = new Set(chunk.map((packet) => packet.po));
  const notes = {};
  for (const [po, text] of Object.entries(notesFromReply(raw, wanted))) {
    if (!/[.!?]$/.test(text) || !poNoteGuard({ text }, allowedPos, known).ok) continue;
    notes[po] = text;
  }
  return notes;
}

async function explainChunk(chunk, allowedPos, known, complete) {
  const notes = await askChunk(chunk, allowedPos, known, complete);
  const missing = chunk.filter((packet) => !notes[packet.po]);
  if (!missing.length || missing.length === chunk.length) return notes;
  const again = await askChunk(missing, allowedPos, known, complete);
  return { ...notes, ...again };
}

/**
 * Bedrock comment per scheduled order, keyed by PO. Orders whose comment fails the guard
 * (or the whole chunk on a model error) get none; the gold reasonShort still shows.
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
