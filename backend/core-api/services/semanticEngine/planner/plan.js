import { rankLine, repairGmoSequence, speciesBoundaries } from './rank.js';
import { holdEntries, timeSequence, weeklyLoad } from './timeline.js';

function lineFor(snapshot, workCenterCode) {
  return Object.entries(snapshot.lines).find(([, line]) => line.workCenterCode === workCenterCode);
}

export function applyOverrides(snapshot) {
  const orders = snapshot.orders.map((order) => ({ ...order }));
  const previous = new Map((snapshot.previousEntries || []).map((entry) => [entry.poNumber, entry]));
  for (const override of snapshot.overrides || []) {
    if (override.active === false) continue;
    const order = orders.find((candidate) => candidate.poNumber === override.po);
    if (!order) continue;
    if (override.type === 'LINE_SWAP') {
      const target = lineFor(snapshot, override.workCenterCode);
      if (target) order.lineId = target[0];
    }
    if (override.type === 'MANUAL_POSITION' && override.position != null) order.manualPosition = override.position;
    if (override.type === 'LOCK') order.manualPosition = override.position ?? previous.get(order.poNumber)?.position;
    if (override.type === 'RUSH_SHIP_BY') order.shipBy = override.shipBy;
  }
  return orders;
}

function placeRush(sequence, rush, line, snapshot) {
  const order = sequence.find((candidate) => candidate.poNumber === rush.po);
  if (!order) return { sequence, violations: [] };
  const rest = sequence.filter((candidate) => candidate !== order);
  const boundaries = speciesBoundaries(rest);
  let chosen = boundaries[0] ?? rest.length;
  const violations = [];
  let placedOnTime = false;
  for (const boundary of boundaries) {
    const trial = rest.slice();
    trial.splice(boundary, 0, order);
    const timed = timeSequence(trial, line, snapshot, 'rush', new Map());
    const entry = timed.find((row) => row.poNumber === rush.po);
    if (rush.shipBy && Date.parse(entry.plannedEndAt) <= Date.parse(rush.shipBy)) {
      chosen = boundary;
      placedOnTime = true;
      break;
    }
  }
  if (rush.shipBy && !placedOnTime) violations.push({ code: 'RUSH_MISSES_SHIP_BY', po: rush.po, shipBy: rush.shipBy });
  order.rushPlacement = true;
  const next = rest.slice();
  next.splice(chosen, 0, order);
  return { sequence: next, violations };
}

export function computePlan(snapshot, options = {}) {
  if (!snapshot?.asOf || !snapshot.rules) throw new Error('snapshot needs asOf and rules');
  const orders = applyOverrides(snapshot);
  const previousByPo = new Map((snapshot.previousEntries || []).map((entry) => [entry.poNumber, entry.position]));
  const previousRisk = new Map((snapshot.previousEntries || []).map((entry) => [entry.poNumber, entry.isAtRisk === true]));
  const payloads = {};
  const violations = [...(options.violations || [])];

  for (const [lineId, line] of Object.entries(snapshot.lines)) {
    const onLine = orders.filter((order) => order.lineId === lineId);
    let sequence = rankLine(onLine);
    const repaired = repairGmoSequence(sequence);
    sequence = repaired.sequence;
    violations.push(...repaired.violations);
    if (options.rush && onLine.some((order) => order.poNumber === options.rush.po)) {
      const rushed = placeRush(sequence, options.rush, { ...line, lineId }, snapshot);
      sequence = rushed.sequence;
      violations.push(...rushed.violations);
    }
    const planned = timeSequence(sequence, { ...line, lineId }, snapshot, options.eventType || null, previousByPo);
    const held = holdEntries(onLine, planned.length + 1, previousByPo, options.eventType || null);
    const entries = [...planned, ...held];
    const lateNow = new Set(entries.filter((entry) => entry.isAtRisk).map((entry) => entry.poNumber));
    const hadPrevious = (snapshot.previousEntries || []).length > 0;
    const newlyLate = hadPrevious ? [...lateNow].filter((po) => !previousRisk.get(po)) : [];
    const noLongerLate = hadPrevious
      ? [...previousRisk.entries()].filter(([po, was]) => was && !lateNow.has(po) && onLine.some((order) => order.poNumber === po)).map(([po]) => po)
      : [];
    payloads[lineId] = {
      entries,
      impact: {
        late: [...lateNow],
        newlyLate,
        noLongerLate,
        weeklyLoad: weeklyLoad(entries, { ...line, lineId }, snapshot),
      },
      proposals: snapshot.proposals || [],
      downtime: snapshot.downtime || [],
      overrides: snapshot.overrides || [],
      violations: [],
    };
  }

  for (const payload of Object.values(payloads)) payload.violations = violations;
  return { payloads };
}
