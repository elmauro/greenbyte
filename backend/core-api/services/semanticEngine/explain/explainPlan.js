const PO_PATTERN = /\b\d{7,12}\b/g;
const DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;

function packetText(packet) {
  return JSON.stringify({
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
  const fromImpact = [...(packet.impact?.newlyLate || []), ...(packet.impact?.noLongerLate || [])].map(String);
  const fromDiff = [
    ...(packet.diff?.added || []),
    ...(packet.diff?.removed || []),
    ...(packet.diff?.held || []),
    ...(packet.diff?.moves || []).map((move) => move.po),
  ].map((po) => String(po || '')).filter(Boolean);
  const fromProposals = (packet.proposals || []).map((proposal) => String(proposal.parentPo || '')).filter(Boolean);
  return new Set([...fromEntries, ...fromImpact, ...fromDiff, ...fromProposals, ...(packet.citablePos || [])]);
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

export function templateExplanation(packet) {
  const late = packet.impact?.newlyLate || [];
  const proposals = packet.proposals || [];
  const line = packet.lineId || 'the line';
  const focus = late[0] || proposals[0]?.parentPo || packet.entries?.[0]?.poNumber || packet.entries?.[0]?.po;
  const banner = late.length
    ? `${late.length} order${late.length === 1 ? '' : 's'} now finish after the SAP finish date on ${line}.`
    : `Plan updated for ${line}.`;
  const bullets = [];
  if (late.length) bullets.push(`Newly late: ${late.join(', ')}.`);
  for (const proposal of proposals) {
    bullets.push(proposal.route
      ? `Repair proposal for ${proposal.parentPo}: ${proposal.route}.`
      : `Repair proposal for ${proposal.parentPo}: route not mapped.`);
  }
  const load = packet.impact?.weeklyLoad?.[0];
  if (load) bullets.push(`Week ${load.week}: ${load.hoursRequired} h required, ${load.hoursAvailable} h available.`);
  if (packet.violations?.length) bullets.push(`Needs a look: ${packet.violations.map((item) => item.code).join(', ')}.`);
  if (!bullets.length) bullets.push('Order follows priority, then species, then SAP finish date.');
  return {
    alertBanner: banner,
    summary: focus ? `${banner} Focus ${focus}.` : banner,
    bullets: bullets.slice(0, 4),
    impact: late.length ? `Newly late: ${late.join(', ')}.` : 'No new SAP-finish misses.',
  };
}

export async function explainPlan(packet, clients = {}) {
  const fallback = templateExplanation(packet);
  if (!clients.complete) return { explanation: fallback, source: 'template' };
  let lastReason = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await clients.complete(explainPrompt(packet, lastReason));
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
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
    'Use only process order numbers and dates from this packet. Lead with orders that miss the SAP finish date.',
    rejection ? `Previous answer was rejected: ${rejection}.` : '',
    packetText(packet),
  ].filter(Boolean).join('\n');
}
