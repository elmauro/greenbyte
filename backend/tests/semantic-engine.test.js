import { handler as explainHandler } from '../core-api/functions/agent-explain-replan/handler.js';
import { handler as factsHandler } from '../core-api/functions/agent-facts-extract/handler.js';
import { handler as planHandler } from '../core-api/functions/agent-plan-compute/handler.js';
import { loadSnapshot, savePlan } from '../core-api/services/semanticEngine/db/goldGateway.js';
import { explainPlan, explanationGuard } from '../core-api/services/semanticEngine/explain/explainPlan.js';
import { extractFacts } from '../core-api/services/semanticEngine/notes/extractFacts.js';
import { snapshotFromGold } from '../core-api/services/semanticEngine/snapshot/mapSnapshot.js';

const asOf = '2026-10-05T06:00:00-07:00';

function post(body) {
  return { body: JSON.stringify(body) };
}

describe('note reader', () => {
  it('tags fumigation, hold, and rush without a model', async () => {
    const result = await extractFacts([
      { po: '1001', text: 'Needs fumi!!', asOf },
      { po: '1002', text: 'CLN-2 ON HOLD' },
      { po: '1003', text: 'RUSH - Priority 1' },
      { po: '1004', text: 'sizing today' },
    ]);
    const byPo = Object.fromEntries(result.notes.map((note) => [note.po, note]));
    expect(byPo['1001'].reader).toBe('RULE');
    expect(byPo['1001'].facts[0]).toMatchObject({ fact_type: 'NOT_READY', status: 'AUTO' });
    expect(byPo['1001'].facts[0].fact_value.reason).toBe('FUMIGATION');
    expect(byPo['1001'].facts[0].fact_value.ready_by).toBeTruthy();
    expect(byPo['1002'].facts[0].fact_type).toBe('HOLD');
    expect(byPo['1003'].facts[0].fact_type).toBe('RUSH');
    expect(byPo['1004'].facts[0].status).toBe('NEEDS_CONFIRMATION');
  });

  it('asks the classifier only when the rules are unsure', async () => {
    const calls = [];
    const result = await extractFacts(
      [{ po: '1001', text: 'Needs fumi!!' }, { po: '1009', text: 'call the lab before noon' }],
      { classify: async (text) => { calls.push(text); return { fact_type: 'HOLD', confidence: 0.82, modelId: 'typesafe/jev-1.13' }; } },
    );
    expect(calls).toEqual(['call the lab before noon']);
    expect(result.notes[1]).toMatchObject({ reader: 'BEDROCK', modelId: 'typesafe/jev-1.13' });
    expect(result.notes[1].facts[0].fact_type).toBe('HOLD');
  });
});

describe('explainer', () => {
  const packet = {
    lineId: 'line-2',
    entries: [{ poNumber: '1002307551', position: 1, dueDate: '2026-10-20' }],
    impact: { newlyLate: ['1002307551'], weeklyLoad: [{ lineId: 'line-2', week: '2026-W41', hoursRequired: 10, hoursAvailable: 144 }] },
    proposals: [],
    violations: [],
  };

  it('keeps a grounded model answer and drops an invented order', async () => {
    const accepted = await explainPlan(packet, {
      complete: async () => JSON.stringify({
        alertBanner: 'One order misses its SAP finish date.',
        summary: 'PO 1002307551 is newly late.',
        bullets: ['Newly late: 1002307551.'],
        impact: 'Newly late: 1002307551.',
      }),
    });
    expect(accepted.source).toBe('bedrock');

    const rejected = await explainPlan(packet, {
      complete: async () => JSON.stringify({
        alertBanner: 'Problem.',
        summary: 'PO 9999999999 moved.',
        bullets: ['PO 9999999999.'],
        impact: 'none',
      }),
    });
    expect(rejected.source).toBe('template');
    expect(explanationGuard(rejected.explanation, packet).ok).toBe(true);
    expect(rejected.explanation.summary).toMatch(/1002307551/);
  });
});

describe('gold snapshot', () => {
  it('builds a planner snapshot from queue rows', () => {
    const snapshot = snapshotFromGold({
      asOf,
      rules: { season: 'HARVEST', timeZone: 'America/Los_Angeles', calendar: { LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' } }, cleanoutTriggers: [], repairRoutes: {} },
      rows: [
        { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 5, process_order_id: 9, po_number: '1002307551', species_code: 'PEA', variety_code: 'A', trait_family_code: 'NONE', input_kg: '1000', priority_rank: 2, sap_finish_date: '2026-10-20', status_code: 'PLANNED', is_hold: false },
        { demo_line_id: null, work_center_code: 'LSVCLSRT', line_schedule_item_id: 8, process_order_id: 11, po_number: '3001', species_code: 'CORN', variety_code: 'C', trait_family_code: 'NONE', input_kg: '500', priority_rank: 1, sap_finish_date: '2026-10-18', status_code: 'PLANNED', is_hold: false },
      ],
      facts: [{ po_number: '1002307551', fact_type: 'NOT_READY', status: 'AUTO', semantic_fact_id: 4, note_text: 'Needs fumi!!', fact_value: { reason: 'FUMIGATION', ready_by: '2026-10-08T00:00:00Z' } }],
      changeovers: [{ work_center_code: 'LSVLN2', transition_code: 'SPECIES_CHANGE', hours: 2.5 }],
      throughput: [{ work_center_code: 'LSVLN2', grain: 'WORK_CENTER', median_kg_per_h: 800 }],
      previousPayload: { proposals: [{ parentPo: '999', route: 'COLORSORT', status: 'PROPOSED' }, { parentPo: '998', status: 'LINKED' }] },
    });
    expect(snapshot.orders.map((order) => order.poNumber)).toEqual(['1002307551', '3001']);
    expect(snapshot.orders[0].readyBy).toBe('2026-10-08T00:00:00Z');
    expect(snapshot.orders[0].sapFinishDate).toBe('2026-10-20');
    expect(snapshot.orders[1].lineId).toBe('line-2');
    expect(snapshot.lines['line-2'].kgPerHour).toBe(800);
    expect(snapshot.proposals).toHaveLength(1);
  });

  it('loads and saves through a query function', async () => {
    const calls = [];
    const query = async (text, params) => {
      calls.push({ text, params });
      if (text.includes('v_open_queue')) {
        return { rows: [{ demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 1, process_order_id: 2, po_number: '1001', species_code: 'PEA', variety_code: 'A', trait_family_code: 'NONE', input_kg: 1000, priority_rank: 1, sap_finish_date: '2026-10-20', status_code: 'ONLINE', is_hold: false }] };
      }
      if (text.includes('v_trusted_fact')) return { rows: [] };
      if (text.includes('planner_rules')) return { rows: [{ value: JSON.stringify({ season: 'HARVEST', timeZone: 'America/Los_Angeles', calendar: { LSVLN1: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' }, LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' } }, cleanoutTriggers: [], repairRoutes: {} }) }] };
      if (text.includes('changeover_rule')) return { rows: [] };
      if (text.includes('v_throughput')) return { rows: [] };
      if (text.includes('INSERT INTO gold.plan_event')) return { rows: [{ plan_event_id: 15 }] };
      if (text.includes('planner-v2') && text.includes('DISTINCT ON')) return { rows: [] };
      if (text.includes('gold.replan')) return { rows: [{ schedule_plan_id: 44 }] };
      return { rows: [] };
    };
    const snapshot = await loadSnapshot(query, { asOf });
    expect(snapshot.orders).toHaveLength(1);
    const saved = await savePlan(query, {
      eventType: 'rush',
      payloads: { 'line-2': { entries: [], impact: {}, proposals: [], downtime: [], overrides: [], violations: [] } },
    });
    expect(saved).toEqual([{ lineId: 'line-2', planEventId: 15, schedulePlanId: 44 }]);
    expect(calls.some((call) => call.text.includes('gold.replan') && call.params[0] === 'line-2' && call.params[1] === 15)).toBe(true);
  });
});

describe('agent handlers', () => {
  it('computes a plan from a posted snapshot', async () => {
    const response = await planHandler(post({
      snapshot: {
        asOf,
        rules: { season: 'HARVEST', timeZone: 'America/Los_Angeles', calendar: { LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' } }, cleanoutTriggers: ['SPECIES_CHANGE'], repairRoutes: { DISCOLORED: 'COLORSORT' } },
        lines: { 'line-2': { workCenterCode: 'LSVLN2', kgPerHour: 1000, changeover: { SAME_VARIETY: 1, SAME_SPECIES: 1, SPECIES_CHANGE: 2, TRAIT_CHANGE: 2 } } },
        orders: [
          { lineId: 'line-2', lineScheduleItemId: 1, processOrderId: 1, poNumber: '1001', speciesCode: 'PEA', varietyCode: 'A', traitFamilyCode: 'NONE', inputKg: 1000, priorityRank: 1, sapFinishDate: '2026-10-20', statusCode: 'ONLINE' },
          { lineId: 'line-2', lineScheduleItemId: 2, processOrderId: 2, poNumber: '1002', speciesCode: 'CORN', varietyCode: 'C', traitFamilyCode: 'NONE', inputKg: 1000, priorityRank: 2, sapFinishDate: '2026-10-20', statusCode: 'PLANNED' },
        ],
      },
      event: { type: 'qa_fail', po: '8888', failReason: 'DISCOLORED' },
    }));
    const body = JSON.parse(response.body);
    expect(response.statusCode).toBe(200);
    expect(body.payloads['line-2'].entries.map((entry) => entry.poNumber)).toEqual(['1001', '1002']);
    expect(body.payloads['line-2'].proposals[0].route).toBe('COLORSORT');
  });

  it('extracts facts and explains from the template', async () => {
    const facts = await factsHandler(post({ notes: [{ po: '1001', text: 'Wait for raw germ' }] }));
    expect(JSON.parse(facts.body).notes[0].facts[0].fact_type).toBe('NOT_READY');
    const explained = await explainHandler(post({
      lineId: 'line-2',
      entries: [{ poNumber: '1001' }],
      impact: { newlyLate: [] },
    }));
    expect(JSON.parse(explained.body).source).toBe('template');
  });
});
