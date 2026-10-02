import { withReadyBy } from '../notes/rules.js';

const REPAIR_CENTERS = new Set(['LSVGRVTY', 'LSVCLSRT']);

function isoDate(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

// gold.replan rejects entries whose schedule row is on another work center, so repair-table
// rows join a line plan only when the caller opts in with repairLineId.
function lineIdFor(row, repairLineId) {
  if (row.demo_line_id === 'line-1' || row.demo_line_id === 'line-2') return row.demo_line_id;
  if (repairLineId && REPAIR_CENTERS.has(row.work_center_code)) return repairLineId;
  return null;
}

function rulesOrDefault(raw) {
  if (!raw) {
    return {
      season: 'HARVEST',
      timeZone: 'America/Los_Angeles',
      calendar: {
        LSVLN1: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' },
        LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' },
      },
      cleanoutTriggers: ['SPECIES_CHANGE', 'BEFORE_EXCELIS', 'AFTER_GMO'],
      repairRoutes: { DENT: 'COLORSORT', DISCOLORED: 'COLORSORT', FM: 'GRAVITY', AP: 'GRAVITY' },
    };
  }
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export function snapshotFromGold(input) {
  const repairLineId = input.repairLineId || null;
  const rules = rulesOrDefault(input.rules);
  const previous = input.previousPayload || {};
  const factsByPo = new Map();
  for (const fact of input.facts || []) {
    const po = fact.po_number || fact.poNumber;
    if (!po) continue;
    const list = factsByPo.get(po) || [];
    list.push(fact);
    factsByPo.set(po, list);
  }
  const rateByLineSpecies = new Map();
  const rateByLine = new Map();
  for (const row of input.throughput || []) {
    const key = `${row.work_center_code}:${row.species_code || ''}:${row.grain}`;
    rateByLineSpecies.set(key, Number(row.median_kg_per_h));
    if (row.grain === 'WORK_CENTER') rateByLine.set(row.work_center_code, Number(row.median_kg_per_h));
  }
  const changeover = {};
  for (const row of input.changeovers || []) {
    changeover[row.work_center_code] = changeover[row.work_center_code] || {};
    changeover[row.work_center_code][row.transition_code] = Number(row.hours);
  }
  const orders = [];
  for (const row of input.rows || []) {
    const lineId = lineIdFor(row, repairLineId);
    if (!lineId) continue;
    const po = row.po_number;
    const facts = factsByPo.get(po) || [];
    const notReadyRow = facts.find((fact) => fact.fact_type === 'NOT_READY' && ['AUTO', 'CONFIRMED'].includes(fact.status));
    const rushRow = facts.find((fact) => fact.fact_type === 'RUSH' && ['AUTO', 'CONFIRMED'].includes(fact.status));
    const holdRow = facts.find((fact) => fact.fact_type === 'HOLD' && ['AUTO', 'CONFIRMED'].includes(fact.status));
    const rowFacts = facts.filter((fact) => fact.line_schedule_item_id == null
      || Number(fact.line_schedule_item_id) === Number(row.line_schedule_item_id));
    const notReady = notReadyRow
      ? withReadyBy([{ fact_type: 'NOT_READY', fact_value: notReadyRow.fact_value || {} }], input.asOf)[0].fact_value
      : null;
    const gmo = facts.find((fact) => fact.fact_value?.is_gmo === true || fact.fact_value?.reason === 'GMO');
    const certified = facts.find((fact) => fact.fact_value?.is_certified_non_gmo === true);
    const notReadyHold = row.hold_reason === 'NOT_READY' && Boolean(notReady?.ready_by);
    orders.push({
      lineId,
      lineScheduleItemId: Number(row.line_schedule_item_id),
      processOrderId: Number(row.process_order_id),
      poNumber: po,
      speciesCode: row.species_code,
      varietyCode: row.variety_code,
      traitFamilyCode: row.trait_family_code,
      inputKg: row.input_kg == null ? 0 : Number(row.input_kg),
      priorityRank: row.priority_rank == null ? null : Number(row.priority_rank),
      schedulePriorityRank: row.schedule_priority_rank == null ? null : Number(row.schedule_priority_rank),
      sapFinishDate: isoDate(row.sap_finish_date),
      statusCode: row.status_code === 'ONLINE' && REPAIR_CENTERS.has(row.work_center_code) ? 'RELEASED' : row.status_code,
      sourceStatusCode: row.status_code,
      workCenterCode: row.work_center_code,
      isHold: row.is_hold === true && !notReadyHold,
      qualityTestId: row.hold_reason === 'QA_FAIL' ? row.latest_fail_test_id ?? null : null,
      kgPerHour: rateByLineSpecies.get(`${row.work_center_code}:${row.species_code}:SPECIES`) || null,
      readyBy: notReady?.ready_by || null,
      notReadyFact: notReadyRow
        ? { id: Number(notReadyRow.semantic_fact_id), label: notReady.reason || 'NOT_READY', noteText: notReadyRow.note_text || '' }
        : null,
      isRush: row.is_rush === true || Boolean(rushRow),
      rushFact: rushRow
        ? { id: Number(rushRow.semantic_fact_id), noteText: rushRow.note_text || '' }
        : null,
      holdFact: row.hold_reason === 'NOTE_HOLD' && holdRow
        ? { id: Number(holdRow.semantic_fact_id), noteText: holdRow.note_text || '' }
        : null,
      noteFacts: rowFacts
        .filter((fact) => fact.note_text)
        .map((fact) => ({ type: fact.fact_type, text: fact.note_text })),
      isGmo: gmo ? true : null,
      isCertifiedNonGmo: certified ? true : null,
    });
  }
  const lineCodes = { 'line-1': 'LSVLN1', 'line-2': 'LSVLN2' };
  const lines = {};
  for (const [lineId, workCenterCode] of Object.entries(lineCodes)) {
    lines[lineId] = {
      workCenterCode,
      kgPerHour: rateByLine.get(workCenterCode) || 1000,
      changeover: changeover[workCenterCode] || { SAME_VARIETY: 2, SAME_SPECIES: 2.5, SPECIES_CHANGE: 2.5, TRAIT_CHANGE: 2.5 },
    };
  }
  return {
    asOf: input.asOf,
    rules,
    lines,
    orders,
    downtime: previous.downtime || [],
    overrides: previous.overrides || [],
    proposals: (previous.proposals || []).filter((proposal) => proposal.status === 'PROPOSED'),
    previousEntries: (previous.entries || []).map((entry) => ({
      poNumber: entry.poNumber,
      position: entry.position,
      isAtRisk: entry.isAtRisk === true,
    })),
  };
}
