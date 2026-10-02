import { handler as explainHandler } from '../core-api/functions/agent-explain-replan/handler.js';
import { handler as factsHandler } from '../core-api/functions/agent-facts-extract/handler.js';
import { handler as planHandler } from '../core-api/functions/agent-plan-compute/handler.js';
import { jest } from '@jest/globals';
import { replanWithSemanticEngine, withSemanticPlan } from '../core-api/services/plantDemo/semanticReplan.js';
import { loadSnapshot, PlannerNotReadyError, readNotesWithJev, savePlan } from '../core-api/services/semanticEngine/db/goldGateway.js';
import { batchAnswerGuard, explainBatchQuestion, failCommand, packetFromGold, resolveFail, rushCommand, templateBatchAnswer } from '../core-api/services/semanticEngine/explain/explainBatch.js';
import { entryPackets, explainEntries, notesFromReply, poNoteGuard } from '../core-api/services/semanticEngine/explain/explainEntries.js';
import { explainPlan, explanationGuard } from '../core-api/services/semanticEngine/explain/explainPlan.js';
import { createJevClassifier, createJevQuestionRouter } from '../core-api/services/semanticEngine/models/clients.js';
import { extractFacts } from '../core-api/services/semanticEngine/notes/extractFacts.js';
import { computePlan } from '../core-api/services/semanticEngine/planner/index.js';
import { rankLine } from '../core-api/services/semanticEngine/planner/rank.js';
import { snapshotFromGold } from '../core-api/services/semanticEngine/snapshot/mapSnapshot.js';

const asOf = '2026-10-05T06:00:00-07:00';

function post(body) {
  return { body: JSON.stringify(body) };
}

describe('note reader', () => {
  it('asks JEV through the OpenRouter Decisions API and maps the choice answers', async () => {
    let request;
    const fetchImpl = async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return {
        ok: true,
        json: async () => ({
          model: 'typesafe/jev-1.13-20260917',
          answers: {
            fact_type: { type: 'choice', choice: 'NOT_READY', confidence: 0.93 },
            not_ready_reason: { type: 'choice', choice: 'RAW_GERM_PENDING', confidence: 0.9 },
          },
        }),
      };
    };
    const result = await extractFacts([{ po: '1005', text: 'germ pending pls', asOf }], { classify: createJevClassifier(fetchImpl) });
    expect(request.url).toBe('https://openrouter.ai/api/alpha/decisions');
    expect(request.body).toMatchObject({ model: 'typesafe/jev-1.13', state: { note: 'germ pending pls' } });
    expect(Object.keys(request.body.questions)).toEqual(['fact_type', 'not_ready_reason']);
    const [note] = result.notes;
    expect(note).toMatchObject({ reader: 'JEV', modelId: 'typesafe/jev-1.13-20260917' });
    expect(note.facts[0]).toMatchObject({ fact_type: 'NOT_READY', status: 'AUTO', confidence: 0.93 });
    expect(Date.parse(note.facts[0].fact_value.ready_by)).toBe(Date.parse(asOf) + 14 * 24 * 3600 * 1000);
  });

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

  it('asks JEV for every note, including ones the rules already recognize', async () => {
    const calls = [];
    const result = await extractFacts(
      [{ po: '1001', text: 'Needs fumi!!' }, { po: '1009', text: 'call the lab before noon' }],
      { classify: async (text) => { calls.push(text); return { fact_type: 'HOLD', confidence: 0.82, modelId: 'typesafe/jev-1.13' }; } },
    );
    expect(calls).toEqual(['Needs fumi!!', 'call the lab before noon']);
    expect(result.notes[0]).toMatchObject({ reader: 'JEV' });
    expect(result.notes[0].facts[0].fact_type).toBe('HOLD');
    expect(result.notes[1].facts[0].fact_type).toBe('HOLD');
  });

  it('stores a JEV reading per unread note and the rules reading when JEV fails', async () => {
    const calls = [];
    const query = async (sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('FROM gold.source_note')) {
        return { rows: [{ note_text: 'push this one up' }, { note_text: 'RUSH - Priority 1' }] };
      }
      return { rows: [] };
    };
    const classify = async (text) => {
      if (text.startsWith('RUSH')) throw new Error('JEV 503');
      return { fact_type: 'RUSH', fact_value: {}, applies_to: 'PO', confidence: 0.91, modelId: 'typesafe/jev-1.13' };
    };
    expect(await readNotesWithJev(query, [11, 12], classify)).toBe(2);
    const insert = calls.find((call) => call.sql.includes('INSERT INTO raw.note_reading'));
    expect(JSON.parse(insert.params[0])).toEqual([
      {
        text: 'push this one up', reader: 'BEDROCK', model_id: 'typesafe/jev-1.13', prompt_version: 'facts-v1',
        facts: [{ fact_type: 'RUSH', fact_value: {}, applies_to: 'PO', confidence: 0.91 }],
      },
      { text: 'RUSH - Priority 1', reader: 'RULE', model_id: 'rules-v1', prompt_version: 'v1', facts: null },
    ]);
    expect(calls.at(-1).sql).toContain('gold.refresh_semantic_facts()');
  });

  it('skips the write when every note already has a JEV reading', async () => {
    const calls = [];
    const query = async (sql) => {
      calls.push(sql);
      return { rows: [] };
    };
    expect(await readNotesWithJev(query, [11], async () => ({ fact_type: 'INFO' }))).toBe(0);
    expect(calls).toHaveLength(1);
  });
});

describe('per-PO notes', () => {
  const entries = [
    {
      poNumber: '1009900001', position: 1, entryStatus: 'PLANNED', dueDate: '2026-10-09',
      plannedStartAt: '2026-09-28T06:00:00-07:00', plannedEndAt: '2026-09-28T20:00:00-07:00', slackDays: 11, isAtRisk: false,
      reasons: [{ code: 'NOTE_RUSH', params: { semantic_fact_id: 5, note_text: 'push this one up' } }],
    },
    {
      poNumber: '1009900005', position: 2, entryStatus: 'HOLD', dueDate: '2026-10-14',
      reasons: [{ code: 'NOTE_HOLD', params: { semantic_fact_id: 6, note_text: 'keep it parked' } }],
    },
  ];
  const orders = [
    { poNumber: '1009900001', speciesCode: 'PECO', varietyCode: 'IDALGO', inputKg: 14000, priorityRank: 4, noteFacts: [{ type: 'RUSH', text: 'push this one up' }] },
    { poNumber: '1009900005', speciesCode: 'SWCO', inputKg: 11000, noteFacts: [{ type: 'HOLD', text: 'keep it parked' }] },
  ];

  it('builds one packet per entry with the note meaning and no fact ids', () => {
    const [first] = entryPackets(entries, orders);
    expect(first).toMatchObject({
      po: '1009900001', position: 1, species: 'PECO', priority: 4, sapFinishDate: '2026-10-09',
      notes: [{ text: 'push this one up', means: 'RUSH' }],
    });
    expect(first.reasons).toEqual([{ code: 'NOTE_RUSH', note_text: 'push this one up' }]);
  });

  it('reads both the line reply and a JSON reply', () => {
    const wanted = new Set(['1009900001']);
    expect(notesFromReply('1009900001 || Runs first.', wanted)).toEqual({ '1009900001': 'Runs first.' });
    expect(notesFromReply('1. 1009900001: Runs first.', wanted)).toEqual({ '1009900001': 'Runs first.' });
    expect(notesFromReply('{"notes":[{"po":"1009900001","text":"Runs first."}]}', wanted)).toEqual({ '1009900001': 'Runs first.' });
  });

  it('keeps grounded comments and drops ones with an invented order or date', async () => {
    let options;
    const complete = async (_prompt, opts) => {
      options = opts;
      return [
        '1009900001 || Runs first because the customer asked to expedite it; done well before 2026-10-09.',
        '1009900005 || Held until QA retest, like 1009999999.',
      ].join('\n');
    };
    const { poNotes } = await explainEntries(entryPackets(entries, orders), { complete });
    expect(options).toMatchObject({ maxTokens: 3000, timeoutMs: 25000 });
    expect(poNotes).toEqual({ '1009900001': expect.stringContaining('expedite') });
    expect(poNoteGuard({ text: 'Finishes 2026-12-01.' }, new Set(['1009900001']), '{}').ok).toBe(false);
  });

  it('asks again, one order at a time, when the group reply leaves some out', async () => {
    const calls = [];
    const complete = async (prompt) => {
      calls.push(prompt);
      if (calls.length === 1) return '1009900001 || Runs first because the customer asked to expedite it';
      return '1009900005 || It stays on hold because the note says to keep it parked.';
    };
    const { poNotes } = await explainEntries(entryPackets(entries, orders), { complete });
    expect(calls).toHaveLength(2);
    expect(calls[1]).toContain('order 1009900005 only');
    expect(poNotes['1009900001']).toBe('Runs first because the customer asked to expedite it.');
    const quoted = await explainEntries(entryPackets(entries, orders), {
      complete: async () => '1009900001 || "Runs first because the customer asked to expedite it.",',
    });
    expect(quoted.poNotes['1009900001']).toBe('Runs first because the customer asked to expedite it.');
    expect(poNotes['1009900005']).toContain('parked');
  });

  it('returns no comments without a model, and survives a model error', async () => {
    expect(await explainEntries(entryPackets(entries, orders), {})).toEqual({ poNotes: {}, source: 'none' });
    const failed = await explainEntries(entryPackets(entries, orders), { complete: async () => 'not json' });
    expect(failed.poNotes).toEqual({});
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

describe('batch chat', () => {
  const context = {
    lineId: 'line-1',
    planVersion: 9,
    queue: [
      { po: '1002267630', position: 1, species: 'PECO', kg: 56170, finish: '2026-09-28 14:13', status: 'PLANNED', reasonShort: 'Already running on LSVLN1 — kept in position 1', reasons: [{ code: 'ALREADY_RUNNING', text: 'Already running' }] },
      { po: '1002266913', position: 2, species: 'PECO', kg: 164940, finish: '2026-10-05', status: 'HOLD', reasonShort: 'Not ready (FUMIGATION): note "Not fumi" — on hold', reasons: [{ code: 'NOT_READY_HOLD', text: 'Not ready' }] },
    ],
    facts: [{ factId: 4, po: '1002267630', type: 'NOT_READY', label: 'FUMIGATION', note: 'Not fumi' }],
  };

  it('quotes the note and keeps a running order in place', () => {
    const packet = packetFromGold(context, {}, '1002267630');
    const answer = templateBatchAnswer(packet, 'WHY_WAITING', 'en');
    expect(answer.answer).toMatch(/already running/);
    expect(answer.answer).toMatch(/Not fumi/);
    expect(answer.citations.join(' ')).toMatch(/fact 4/);
  });

  it('drops a model answer that names an order outside the packet', async () => {
    const packet = packetFromGold(context, {}, '1002266913');
    const result = await explainBatchQuestion({
      packet,
      question: 'Why is it waiting?',
      locale: 'en',
      classify: async () => 'WHY_WAITING',
      complete: async () => JSON.stringify({ answer: 'PO 9999999999 is blocked.' }),
    });
    expect(result.source).toBe('template');
    expect(batchAnswerGuard(result.answer, packet).ok).toBe(true);
    expect(result.answer).toMatch(/1002266913/);
  });

  it('marks an instruction to rush and leaves a question about moving up alone', async () => {
    const packet = packetFromGold(context, {}, '1002266913');
    expect(rushCommand('Rush this order')).toBe(true);
    expect(rushCommand('What would move it up?')).toBe(false);
    const sent = await explainBatchQuestion({
      packet,
      question: 'Rush this order',
      locale: 'en',
      classify: async () => 'MOVE_UP',
      complete: async () => JSON.stringify({ answer: 'This chat does not change the plan.' }),
    });
    expect(sent.action).toBe('rush');
    expect(sent.answer).toMatch(/Rush sent for PO 1002266913/);
    const asked = await explainBatchQuestion({ packet, question: 'What would move it up?', locale: 'en' });
    expect(asked.action).toBeUndefined();
    expect(asked.answer).toMatch(/does not change the plan/);
  });

  it('asks for a fail reason, then records the reason on the next turn', async () => {
    const packet = packetFromGold(context, {}, '1002266913');
    expect(failCommand('This order failed')).toBe(true);
    expect(failCommand('Why did it fail?')).toBe(false);
    const ask = await explainBatchQuestion({ packet, question: 'This order failed', locale: 'en' });
    expect(ask.action).toBe('ask_fail_reason');
    expect(ask.answer).toMatch(/fail reason/);
    expect(ask.failedFor).toBeUndefined();
    const named = await explainBatchQuestion({ packet, question: 'It failed for dent', locale: 'en' });
    expect(named.action).toBe('qa_fail');
    expect(named.failedFor).toBe('Dent');
    const followUp = resolveFail('Discolored', [{ role: 'copilot', text: ask.answer }]);
    expect(followUp).toEqual({ action: 'qa_fail', failedFor: 'Discolored' });
  });

  it('asks JEV which kind of question this is', async () => {
    let body;
    const route = createJevQuestionRouter(async (url, options) => {
      body = JSON.parse(options.body);
      return { ok: true, json: async () => ({ answers: { intent: { choice: 'MOVE_UP' } } }) };
    });
    expect(await route({ po: '1002266913', question: 'the one ahead?', history: [{ role: 'user', text: 'Why is it waiting?' }] })).toBe('MOVE_UP');
    expect(body.state.history).toHaveLength(1);
    expect(body.questions.intent.criteria.MOVE_UP).toMatch(/earlier/);
  });
});

describe('rank', () => {
  it('places a rush ahead of a better SAP priority, after the order already running', () => {
    const sequence = rankLine([
      { poNumber: '1001', priorityRank: 1, speciesCode: 'PECO', sapFinishDate: '2026-10-01', statusCode: 'NEW' },
      { poNumber: '1002', priorityRank: 9, speciesCode: 'PECO', sapFinishDate: '2026-10-01', statusCode: 'ONLINE' },
      { poNumber: '1003', priorityRank: 8, speciesCode: 'SWCO', sapFinishDate: '2026-12-01', statusCode: 'NEW', isRush: true },
    ]);
    expect(sequence.map((order) => order.poNumber)).toEqual(['1002', '1003', '1001']);
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
      facts: [
        { po_number: '1002307551', fact_type: 'NOT_READY', status: 'AUTO', semantic_fact_id: 4, note_text: 'Needs fumi!!', fact_value: { reason: 'FUMIGATION', ready_by: '2026-10-08T00:00:00Z' } },
        { po_number: '1002307551', fact_type: 'RUSH', status: 'AUTO', semantic_fact_id: 9, note_text: 'RUSH - needs fumi' },
      ],
      changeovers: [{ work_center_code: 'LSVLN2', transition_code: 'SPECIES_CHANGE', hours: 2.5 }],
      throughput: [{ work_center_code: 'LSVLN2', grain: 'WORK_CENTER', median_kg_per_h: 800 }],
      previousPayload: { proposals: [{ parentPo: '999', route: 'COLORSORT', status: 'PROPOSED' }, { parentPo: '998', status: 'LINKED' }] },
    });
    expect(snapshot.orders.map((order) => order.poNumber)).toEqual(['1002307551']);
    expect(snapshot.orders[0].readyBy).toBe('2026-10-08T00:00:00Z');
    expect(snapshot.orders[0].isRush).toBe(true);
    expect(snapshot.orders[0].rushFact).toMatchObject({ id: 9, noteText: 'RUSH - needs fumi' });
    expect(snapshot.orders[0].sapFinishDate).toBe('2026-10-20');
    expect(snapshot.lines['line-2'].kgPerHour).toBe(800);
    expect(snapshot.proposals).toHaveLength(1);
  });

  it('puts repair-table orders on a line only when asked', () => {
    const rows = [
      { demo_line_id: null, work_center_code: 'LSVCLSRT', line_schedule_item_id: 8, process_order_id: 11, po_number: '3001', species_code: 'CORN', input_kg: '500', status_code: 'ONLINE', is_hold: false },
    ];
    expect(snapshotFromGold({ asOf, rows }).orders).toHaveLength(0);
    const [repair] = snapshotFromGold({ asOf, rows, repairLineId: 'line-2' }).orders;
    expect(repair).toMatchObject({ lineId: 'line-2', statusCode: 'RELEASED', sourceStatusCode: 'ONLINE' });
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
      if (text.includes('pg_get_functiondef')) return { rows: [{ ok: true }] };
      if (text.includes('INSERT INTO gold.plan_event')) return { rows: [{ plan_event_id: 15 }] };
      if (text.includes('WITH base')) return { rows: [{ po_number: '1001', position: 3, is_at_risk: true }] };
      if (text.includes('planner-v2') && text.includes('DISTINCT ON')) return { rows: [] };
      if (text.includes('SELECT gold.replan(')) return { rows: [{ schedule_plan_id: 44 }] };
      return { rows: [] };
    };
    const snapshot = await loadSnapshot(query, { asOf });
    expect(snapshot.orders).toHaveLength(1);
    expect(snapshot.previousEntries).toEqual([{ poNumber: '1001', position: 3, isAtRisk: true }]);
    const saved = await savePlan(query, {
      eventType: 'rush',
      payloads: {
        'line-1': { entries: [] },
        'line-2': { entries: [{ poNumber: '1001', position: 1, previousPosition: null }], impact: {}, proposals: [], downtime: [], overrides: [], violations: [] },
      },
    });
    expect(saved).toEqual([{ lineId: 'line-2', planEventId: 15, schedulePlanId: 44 }]);
    const inserted = calls.find((call) => call.text.includes('INSERT INTO gold.plan_event'));
    expect(inserted.text).toContain("'planner_run'");
    const stored = JSON.parse(inserted.params[1]);
    expect(stored.trigger).toBe('rush');
    expect(stored.entries[0]).not.toHaveProperty('previousPosition');
    expect(calls.some((call) => call.text.includes('SELECT gold.replan(') && call.params[0] === 'line-2' && call.params[1] === 15)).toBe(true);
  });

  it('refuses to save before gold.replan reads entries', async () => {
    const query = async (text) => (text.includes('pg_get_functiondef') ? { rows: [{ ok: false }] } : { rows: [] });
    await expect(savePlan(query, { payloads: { 'line-2': {} } })).rejects.toBeInstanceOf(PlannerNotReadyError);
  });

  it('plans a not-ready order after its ready date instead of holding it', () => {
    const snapshot = snapshotFromGold({
      asOf,
      rows: [
        { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 1, process_order_id: 1, po_number: '1001', species_code: 'PEA', input_kg: 1000, priority_rank: 1, sap_finish_date: new Date(2026, 9, 20), status_code: 'NEW', is_hold: true, hold_reason: 'NOT_READY' },
        { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 2, process_order_id: 2, po_number: '1002', species_code: 'PEA', input_kg: 1000, priority_rank: 1, sap_finish_date: '2026-10-20', status_code: 'NEW', is_hold: true, hold_reason: 'QA_FAIL', latest_fail_test_id: 77 },
      ],
      facts: [{ po_number: '1001', fact_type: 'NOT_READY', status: 'AUTO', semantic_fact_id: 3, note_text: 'Needs fumi!!', fact_value: { reason: 'FUMIGATION' } }],
    });
    const [fumigation, failed] = snapshot.orders;
    expect(fumigation.isHold).toBe(false);
    expect(fumigation.sapFinishDate).toBe('2026-10-20');
    expect(Date.parse(fumigation.readyBy)).toBe(Date.parse(asOf) + 3 * 24 * 3600 * 1000);
    expect(failed).toMatchObject({ isHold: true, qualityTestId: 77 });
  });

  it('cites the note that holds an order', () => {
    const snapshot = snapshotFromGold({
      asOf,
      rules: { season: 'HARVEST', timeZone: 'America/Los_Angeles', calendar: { LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' } }, cleanoutTriggers: [] },
      rows: [
        { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 5, process_order_id: 5, po_number: '1005', species_code: 'PECO', input_kg: 1000, sap_finish_date: '2026-10-20', status_code: 'NEW', is_hold: true, hold_reason: 'NOTE_HOLD' },
      ],
      facts: [{ po_number: '1005', line_schedule_item_id: 5, fact_type: 'HOLD', status: 'AUTO', semantic_fact_id: 41, note_text: 'keep it parked until the retest' }],
    });
    expect(snapshot.orders[0]).toMatchObject({
      isHold: true,
      holdFact: { id: 41, noteText: 'keep it parked until the retest' },
      noteFacts: [{ type: 'HOLD', text: 'keep it parked until the retest' }],
    });
    const [entry] = computePlan(snapshot).payloads['line-2'].entries;
    expect(entry.entryStatus).toBe('HOLD');
    expect(entry.reasons).toEqual([expect.objectContaining({ code: 'NOTE_HOLD', factIds: [41] })]);
  });
});

describe('BFF semantic replan', () => {
  const rules = JSON.stringify({ season: 'HARVEST', timeZone: 'America/Los_Angeles', calendar: { LSVLN1: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' }, LSVLN2: { weekdays: [1, 2, 3, 4, 5, 6], start: '00:00', end: '24:00' } }, cleanoutTriggers: ['SPECIES_CHANGE'], repairRoutes: { DISCOLORED: 'COLORSORT' } });

  function fakeDb({ entriesSupported = true } = {}) {
    const calls = [];
    const query = async (text, params) => {
      calls.push({ text, params });
      if (text.includes('v_open_queue')) {
        return { rows: [
          { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 1, process_order_id: 1, po_number: '1001', species_code: 'PEA', variety_code: 'A', input_kg: 1000, priority_rank: 1, sap_finish_date: '2026-10-20', status_code: 'ONLINE', is_hold: false },
          { demo_line_id: 'line-2', work_center_code: 'LSVLN2', line_schedule_item_id: 2, process_order_id: 2, po_number: '1002', species_code: 'CORN', variety_code: 'C', input_kg: 1000, priority_rank: 2, sap_finish_date: '2026-10-20', status_code: 'NEW', is_hold: false },
        ] };
      }
      if (text.includes('planner_rules')) return { rows: [{ value: rules }] };
      if (text.includes('plan_start_at')) return { rows: [{ as_of: new Date(asOf) }] };
      if (text.includes('pg_get_functiondef')) return { rows: [{ ok: entriesSupported }] };
      if (text.includes('INSERT INTO gold.plan_event')) return { rows: [{ plan_event_id: params[0] === 'line-2' ? 20 : 10 }] };
      if (text.includes('SELECT gold.replan(')) return { rows: [{ schedule_plan_id: params[0] === 'line-2' ? 200 : 100 }] };
      if (text.includes('gold.event_response')) {
        return { rows: [{ result: { lineId: 'line-2', eventType: 'qa_fail', planVersion: 7, queue: [{ po: '1001', species: 'PEA', kg: 1000, finish: '2026-10-05 07:00', status: 'PLANNED' }], diff: { moves: [] } } }] };
      }
      return { rows: [] };
    };
    return { query, calls };
  }

  beforeEach(() => {
    delete process.env.BEDROCK_ENABLED;
    delete process.env.JEV_ENABLED;
  });

  afterEach(() => {
    delete process.env.SEMANTIC_PLANNER_ENABLED;
  });

  it('saves both lines, explains the focus line, and stores the explanation', async () => {
    const { query, calls } = fakeDb();
    const result = await replanWithSemanticEngine(query, { lineId: 'line-2', kind: 'qa_fail_finished', po: '8888', failedFor: 'Discolored' });
    expect(result.planVersion).toBe(7);
    expect(result.proposals).toEqual([expect.objectContaining({ parentPo: '8888', route: 'COLORSORT' })]);
    expect(result.explanation.bullets.join(' ')).toMatch(/8888: COLORSORT/);
    expect(result.eventType).toBe('qa_fail');
    expect(result.explanation.alertBanner).toBe('QA fail (Discolored) on 8888: repair proposed for Line 2.');
    expect(calls.filter((call) => call.text.includes('SELECT gold.replan(')).map((call) => call.params[0])).toEqual(['line-2']);
    const insert = calls.find((call) => call.text.includes('INSERT INTO gold.plan_event'));
    expect(JSON.parse(insert.params[1]).event).toEqual({ kind: 'qa_fail', po: '8888', failedFor: 'Discolored' });
    const stored = calls.find((call) => call.text.includes('UPDATE gold.plan_event'));
    expect(stored.params[0]).toBe(20);
    expect(JSON.parse(stored.params[2])).toEqual({});
    expect(calls.some((call) => call.text.includes('raw.note_reading'))).toBe(false);
  });

  it('plans one line from the orders already on it', async () => {
    const { query, calls } = fakeDb();
    const result = await replanWithSemanticEngine(query, { lineId: 'line-2', kind: 'queue_refresh', onlyLine: true });
    expect(result.explanation.alertBanner).toBe('Line 2 ordered from the raw orders. Nothing written to SAP.');
    expect(calls.filter((call) => call.text.includes('SELECT gold.replan(')).map((call) => call.params[0])).toEqual(['line-2']);
  });

  it('falls back to the heuristic when disabled or when replan cannot read entries', async () => {
    const fallback = async () => ({ source: 'heuristic' });
    expect(await withSemanticPlan(fakeDb().query, { lineId: 'line-2', kind: 'rush' }, fallback)).toEqual({ source: 'heuristic' });
    process.env.SEMANTIC_PLANNER_ENABLED = 'true';
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await withSemanticPlan(fakeDb({ entriesSupported: false }).query, { lineId: 'line-2', kind: 'rush', po: '1002' }, fallback)).toEqual({ source: 'heuristic' });
    warn.mockRestore();
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
