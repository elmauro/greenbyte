const PO_PATTERN = /\b\d{7,12}\b/g;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;

function packetText(packet) {
  return JSON.stringify({
    event: packet.event || null,
    impact: packet.impact || {},
    proposals: packet.proposals || [],
    entries: (packet.entries || []).map((entry) => ({
      po: entry.poNumber || entry.po,
      position: entry.position,
      dueDate: entry.dueDate,
      slackDays: entry.slackDays,
      estRunH: entry.estRunH,
      estChangeoverH: entry.estChangeoverH,
    })),
    diff: packet.diff || {},
    violations: packet.violations || [],
  });
}

export function citablePos(packet) {
  const fromEntries = (packet.entries || []).map((entry) => String(entry.poNumber || entry.po || '')).filter(Boolean);
  const fromImpact = [
    ...(packet.impact?.late || []),
    ...(packet.impact?.newlyLate || []),
    ...(packet.impact?.noLongerLate || []),
  ].map(String);
  const fromDiff = [
    ...(packet.diff?.added || []),
    ...(packet.diff?.removed || []),
    ...(packet.diff?.held || []),
    ...(packet.diff?.moves || []).map((move) => move.po),
  ].map((po) => String(po || '')).filter(Boolean);
  const fromProposals = (packet.proposals || []).map((proposal) => String(proposal.parentPo || '')).filter(Boolean);
  const fromEvent = packet.event?.po ? [String(packet.event.po)] : [];
  return new Set([...fromEntries, ...fromImpact, ...fromDiff, ...fromProposals, ...fromEvent, ...(packet.citablePos || [])]);
}

export function explanationGuard(explanation, packet) {
  if (!explanation || typeof explanation.summary !== 'string' || !Array.isArray(explanation.bullets)) {
    return { ok: false, reason: 'shape' };
  }
  const text = [explanation.alertBanner, explanation.summary, explanation.impact, ...explanation.bullets].join('\n');
  const allowed = citablePos(packet);
  const unknownPo = [...text.matchAll(PO_PATTERN)].map((match) => match[0]).find((po) => !allowed.has(po));
  if (unknownPo) return { ok: false, reason: `unknown po ${unknownPo}` };
  const known = packetText(packet);
  const unknownDate = [...text.matchAll(DATE_PATTERN)].map((match) => match[0]).find((date) => !known.includes(date));
  if (unknownDate) return { ok: false, reason: `unknown date ${unknownDate}` };
  return { ok: true };
}

function listPos(pos, max = 5) {
  if (pos.length <= max) return pos.join(', ');
  return `${pos.slice(0, max).join(', ')} and ${pos.length - max} more`;
}

function lineLabel(lineId) {
  const number = String(lineId || '').match(/(\d+)$/)?.[1];
  return number ? `Line ${number}` : 'the line';
}

function eventHeadline(event, entries, line) {
  if (event?.kind === 'queue_refresh' && !event.po) {
    return `${line} ordered from the raw orders. Nothing written to SAP.`;
  }
  if (!event?.po) return null;
  if (event.kind === 'qa_fail') {
    return `QA fail${event.failedFor ? ` (${event.failedFor})` : ''} on ${event.po}: repair proposed for ${line}.`;
  }
  if (event.kind === 'rush' || event.kind === 'priority_change') {
    const entry = (entries || []).find((row) => String(row.poNumber || row.po) === String(event.po));
    return entry?.position != null
      ? `Rush ${event.po} placed at position ${entry.position} on ${line}.`
      : `Rush ${event.po} re-planned on ${line}.`;
  }
  return null;
}

export function templateExplanation(packet) {
  const newlyLate = packet.impact?.newlyLate || [];
  const late = packet.impact?.late || newlyLate;
  const proposals = packet.proposals || [];
  const line = lineLabel(packet.lineId);
  const focus = newlyLate[0] || proposals[0]?.parentPo || packet.entries?.[0]?.poNumber || packet.entries?.[0]?.po;
  const plural = (n) => `${n} order${n === 1 ? '' : 's'}`;
  const lateBanner = newlyLate.length
    ? `${plural(newlyLate.length)} now finish after the SAP finish date on ${line}.`
    : late.length
      ? `${plural(late.length)} on ${line} finish after the SAP finish date.`
      : `Plan updated for ${line}; every order meets its SAP finish date.`;
  const eventBanner = eventHeadline(packet.event, packet.entries, line);
  const banner = eventBanner || lateBanner;
  const bullets = [];
  if (eventBanner && (newlyLate.length || late.length)) bullets.push(lateBanner);
  if (newlyLate.length) bullets.push(`Newly late: ${listPos(newlyLate)}.`);
  else if (late.length) bullets.push(`Late: ${listPos(late)}.`);
  for (const proposal of proposals.slice(0, 2)) {
    bullets.push(proposal.route
      ? `Repair proposal for ${proposal.parentPo}: ${proposal.route}.`
      : `Repair proposal for ${proposal.parentPo}: route not mapped yet.`);
  }
  const overloaded = (packet.impact?.weeklyLoad || []).find((row) => row.hoursRequired > row.hoursAvailable);
  if (overloaded) {
    bullets.push(`Week ${overloaded.week}: ${overloaded.hoursRequired} h of work for ${overloaded.hoursAvailable} h of line time.`);
  }
  if (packet.violations?.length) bullets.push(`Needs a look: ${[...new Set(packet.violations.map((item) => item.code))].join(', ')}.`);
  bullets.push('Order follows priority, then species, then SAP finish date. No SAP write.');
  return {
    alertBanner: banner,
    summary: focus ? `${banner} Focus PO ${focus}.` : banner,
    bullets: bullets.slice(0, 4),
    impact: newlyLate.length
      ? `Newly late: ${listPos(newlyLate)}.`
      : late.length ? `Late: ${listPos(late)}.` : 'No SAP-finish misses.',
  };
}

/** Models often wrap the JSON in markdown or a sentence. Take the outermost object. */
export function parseModelJson(raw) {
  if (raw && typeof raw === 'object') return raw;
  const text = String(raw).trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error('model reply was not JSON');
  }
}

export async function explainPlan(packet, clients = {}) {
  const fallback = templateExplanation(packet);
  if (!clients.complete) return { explanation: fallback, source: 'template' };
  let lastReason = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await clients.complete(explainPrompt(packet, lastReason), { maxTokens: 2000 });
      const parsed = parseModelJson(raw);
      const check = explanationGuard(parsed, packet);
      if (check.ok) return { explanation: parsed, source: 'bedrock' };
      lastReason = check.reason;
    } catch (err) {
      lastReason = err.message;
    }
  }
  return { explanation: fallback, source: 'template', rejected: lastReason };
}

function explainPrompt(packet, rejection) {
  return [
    'Return JSON with alertBanner, summary, bullets (max 4), impact.',
    'Write those fields as plain sentences a scheduler can read aloud.',
    'Use only process order numbers and dates from this packet. Lead with the triggering event when "event" is set, then orders that miss the SAP finish date.',
    rejection ? `Previous answer was rejected: ${rejection}.` : '',
    packetText(packet),
  ].filter(Boolean).join('\n');
}
