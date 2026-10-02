import { applyPlannerEvent, computePlan } from '../core-api/services/semanticEngine/planner/index.js';

const RULES = {
  season: 'HARVEST',
  timeZone: 'America/Los_Angeles',
  calendar: {
    LSVLN1: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' },
    LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' },
  },
  cleanoutTriggers: ['SPECIES_CHANGE', 'BEFORE_EXCELIS', 'AFTER_GMO'],
  forbiddenSequence: { from: 'GMO', to: 'CERTIFIED_NON_GMO' },
  repairRoutes: { DENT: 'COLORSORT', DISCOLORED: 'COLORSORT', FM: 'GRAVITY', AP: 'GRAVITY' },
};

const LINES = {
  'line-1': {
    workCenterCode: 'LSVLN1',
    kgPerHour: 1000,
    changeover: { SAME_VARIETY: 2, SAME_SPECIES: 2.5, SPECIES_CHANGE: 2.5, TRAIT_CHANGE: 2.5 },
  },
  'line-2': {
    workCenterCode: 'LSVLN2',
    kgPerHour: 1000,
    changeover: { SAME_VARIETY: 2, SAME_SPECIES: 2.5, SPECIES_CHANGE: 2.5, TRAIT_CHANGE: 2.5 },
  },
};

function order(partial) {
  return {
    lineId: 'line-2',
    lineScheduleItemId: Number(partial.poNumber),
    processOrderId: Number(partial.poNumber),
    speciesCode: 'PEA',
    varietyCode: 'A',
    traitFamilyCode: 'NONE',
    inputKg: 1000,
    priorityRank: 1,
    sapFinishDate: '2026-10-20',
    statusCode: 'PLANNED',
    ...partial,
  };
}

function snapshot(overrides = {}) {
  return {
    asOf: '2026-10-05T06:00:00-07:00',
    rules: RULES,
    lines: LINES,
    downtime: [],
    overrides: [],
    proposals: [],
    orders: [
      order({ poNumber: '1001', statusCode: 'ONLINE', speciesCode: 'PEA', varietyCode: 'A' }),
      order({ poNumber: '1002', speciesCode: 'PEA', varietyCode: 'A', sapFinishDate: '2026-10-18' }),
      order({ poNumber: '1003', speciesCode: 'CORN', varietyCode: 'C', sapFinishDate: '2026-10-06' }),
      order({ poNumber: '1004', priorityRank: 2, speciesCode: 'CORN', varietyCode: 'C', sapFinishDate: '2026-10-12' }),
      order({ poNumber: '1005', priorityRank: 2, speciesCode: 'PEA', varietyCode: 'B', sapFinishDate: '2026-10-08' }),
      order({ poNumber: '1006', priorityRank: null, speciesCode: 'BEAN', varietyCode: 'D', sapFinishDate: '2026-10-06' }),
    ],
    ...overrides,
  };
}

function pos(payload) {
  return payload.entries.map((entry) => entry.poNumber);
}

describe('semantic planner', () => {
  it('ranks priority, then the running species, then SAP finish date', () => {
    const { payloads } = computePlan(snapshot());
    expect(pos(payloads['line-2'])).toEqual(['1001', '1002', '1003', '1004', '1005', '1006']);
    const first = payloads['line-2'].entries[0];
    expect(first.entryStatus).toBe('PLANNED');
    expect(first.dueDate).toBe('2026-10-20');
    expect(first.reasons.map((reason) => reason.code)).toContain('ALREADY_RUNNING');
    expect(payloads['line-2'].entries[1].estChangeoverH).toBe(2);
    expect(payloads['line-2'].entries[2].reasons.find((reason) => reason.code === 'CHANGEOVER').params.transition_code).toBe('SPECIES_CHANGE');
  });

  it('charges a full cleanout before Excelis on the same variety', () => {
    const state = snapshot({
      orders: [
        order({ poNumber: '1001', statusCode: 'ONLINE' }),
        order({ poNumber: '1002', traitFamilyCode: 'EXCELIS' }),
      ],
    });
    const entry = computePlan(state).payloads['line-2'].entries[1];
    expect(entry.estChangeoverH).toBe(2.5);
    expect(entry.reasons.find((reason) => reason.code === 'CHANGEOVER').params.transition_code).toBe('TRAIT_CHANGE');
  });

  it('skips Sunday', () => {
    const state = snapshot({
      asOf: '2026-10-03T22:00:00-07:00',
      orders: [order({ poNumber: '1001', statusCode: 'ONLINE', inputKg: 4000, sapFinishDate: '2026-10-04' })],
    });
    const entry = computePlan(state).payloads['line-2'].entries[0];
    expect(entry.plannedEndAt.startsWith('2026-10-05T02:00:00')).toBe(true);
    expect(entry.isAtRisk).toBe(true);
    expect(entry.reasons.map((reason) => reason.code)).toContain('DUE_DATE_RISK');
  });

  it('puts a breaker between GMO and certified non-GMO', () => {
    const state = snapshot({
      orders: [
        order({ poNumber: '2001', statusCode: 'ONLINE', speciesCode: 'CORN', isGmo: true }),
        order({ poNumber: '2002', speciesCode: 'BEAN', isCertifiedNonGmo: true }),
        order({ poNumber: '2003', priorityRank: null, speciesCode: 'PEA', isGmo: false, isCertifiedNonGmo: false }),
      ],
    });
    const result = computePlan(state).payloads['line-2'];
    expect(pos(result)).toEqual(['2001', '2003', '2002']);
    expect(result.violations).toEqual([]);
  });

  it('reports a missing breaker when every other order is unknown', () => {
    const state = snapshot({
      orders: [
        order({ poNumber: '2001', statusCode: 'ONLINE', isGmo: true }),
        order({ poNumber: '2002', isCertifiedNonGmo: true }),
      ],
    });
    expect(computePlan(state).payloads['line-2'].violations.map((item) => item.code)).toContain('NO_BREAKER_AVAILABLE');
  });

  it('holds a queued fail and proposes a repair when the order is already finished', () => {
    const held = applyPlannerEvent(snapshot(), { type: 'qa_fail', po: '1005', failReason: 'DENT', qualityTestId: 99 });
    const hold = held.payloads['line-2'].entries.find((entry) => entry.poNumber === '1005');
    expect(hold.entryStatus).toBe('HOLD');
    expect(hold.plannedStartAt).toBeNull();
    expect(hold.reasons.find((reason) => reason.code === 'QA_HOLD').params.quality_test_id).toBe('99');
    expect(pos(held.payloads['line-2']).at(-1)).toBe('1005');

    const proposed = applyPlannerEvent(snapshot(), { type: 'qa_fail', po: '9999', failReason: 'DISCOLORED' });
    expect(pos(proposed.payloads['line-2'])).toEqual(['1001', '1002', '1003', '1004', '1005', '1006']);
    expect(proposed.payloads['line-2'].proposals).toEqual([
      expect.objectContaining({ parentPo: '9999', route: 'COLORSORT', status: 'PROPOSED', routeStatus: 'CONFIRMED' }),
    ]);

    const unknown = applyPlannerEvent(snapshot(), { type: 'qa_fail', po: '9998', failReason: 'COB' });
    expect(unknown.payloads['line-2'].proposals[0]).toEqual(expect.objectContaining({ route: null, routeStatus: 'ASSUMPTION' }));
  });

  it('places a rush at the next species boundary', () => {
    const soon = applyPlannerEvent(snapshot(), { type: 'rush', po: '1004', shipBy: '2026-10-05T07:00:00-07:00' });
    expect(pos(soon.payloads['line-2'])).toEqual(['1001', '1002', '1004', '1003', '1005', '1006']);
    const rushed = soon.payloads['line-2'].entries.find((entry) => entry.poNumber === '1004');
    expect(rushed.reasons.map((reason) => reason.code)).toContain('RUSH_PRIORITY');
    expect(soon.payloads['line-2'].violations.map((item) => item.code)).toContain('RUSH_MISSES_SHIP_BY');

    const later = applyPlannerEvent(snapshot(), { type: 'rush', po: '1004', shipBy: '2026-10-20T00:00:00-07:00' });
    expect(pos(later.payloads['line-2'])).toEqual(['1001', '1002', '1004', '1003', '1005', '1006']);
    expect(later.payloads['line-2'].violations).toEqual([]);
  });

  it('moves a swapped order onto the other line and keeps downtime on the payload', () => {
    const swapped = applyPlannerEvent(snapshot(), { type: 'line_swap', po: '1006', workCenterCode: 'LSVLN1' });
    expect(pos(swapped.payloads['line-2'])).not.toContain('1006');
    expect(pos(swapped.payloads['line-1'])).toEqual(['1006']);
    expect(swapped.payloads['line-1'].overrides).toEqual([
      expect.objectContaining({ po: '1006', type: 'LINE_SWAP', workCenterCode: 'LSVLN1', active: true }),
    ]);

    const down = applyPlannerEvent(snapshot({
      asOf: '2026-10-05T00:00:00-07:00',
      orders: [order({ poNumber: '1001', statusCode: 'ONLINE', inputKg: 1000 })],
    }), {
      type: 'line_down',
      lineId: 'line-2',
      startsAt: '2026-10-05T00:00:00-07:00',
      endsAt: '2026-10-05T06:00:00-07:00',
      reason: 'BREAKDOWN',
    });
    expect(down.payloads['line-2'].entries[0].plannedEndAt.startsWith('2026-10-05T07:00:00')).toBe(true);
    expect(down.payloads['line-2'].downtime).toHaveLength(1);
    expect(down.payloads['line-2'].impact.weeklyLoad[0].hoursAvailable).toBe(138);
  });

  it('re-slots a priority change and a new order by the same rule', () => {
    const raised = applyPlannerEvent(snapshot(), { type: 'priority_change', po: '1005', priority: 1 });
    expect(pos(raised.payloads['line-2'])).toEqual(['1001', '1005', '1002', '1003', '1004', '1006']);

    const added = applyPlannerEvent(snapshot(), {
      type: 'new_order',
      order: order({ poNumber: '1007', priorityRank: 1, speciesCode: 'CORN', varietyCode: 'C', sapFinishDate: '2026-10-07' }),
    });
    expect(pos(added.payloads['line-2'])).toEqual(['1001', '1002', '1003', '1007', '1004', '1005', '1006']);
  });

  it('crosses the November daylight-saving Sunday', () => {
    const state = snapshot({
      asOf: '2026-10-31T20:00:00-07:00',
      orders: [order({ poNumber: '1001', statusCode: 'ONLINE', inputKg: 6000, sapFinishDate: '2026-11-03' })],
    });
    const result = computePlan(state).payloads['line-2'];
    expect(result.entries[0].plannedEndAt.startsWith('2026-11-02T02:00:00-08:00')).toBe(true);
    expect(result.impact.weeklyLoad.map(({ week, hoursRequired }) => [week, hoursRequired])).toEqual([
      ['2026-W44', 4],
      ['2026-W45', 2],
    ]);
  });

  it('keeps a running order running even when a note says it is not ready', () => {
    const state = snapshot({
      orders: [order({ poNumber: '1001', statusCode: 'ONLINE', inputKg: 1000, readyBy: '2026-10-05T12:00:00-07:00' })],
    });
    const entry = computePlan(state).payloads['line-2'].entries[0];
    expect(Date.parse(entry.plannedEndAt) - Date.parse(state.asOf)).toBe(3600 * 1000);
    expect(entry.reasons.map((reason) => reason.code)).toContain('ALREADY_RUNNING');
  });

  it('does not start a not-ready order before readyBy', () => {
    const state = snapshot({
      orders: [
        order({ poNumber: '1001', statusCode: 'ONLINE', inputKg: 1000 }),
        order({ poNumber: '1002', readyBy: '2026-10-05T12:00:00-07:00' }),
      ],
    });
    const entry = computePlan(state).payloads['line-2'].entries[1];
    expect(entry.plannedStartAt.startsWith('2026-10-05T12:00:00')).toBe(true);
  });
});
