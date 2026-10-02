import { buildExplainReplan } from '../core-api/services/plantDemo/explanationBuilder.js';
import {
  attachPlanExplanation,
  explainContextFromPlan,
  normalizePlanQueue,
  queueResponseFromPlan,
  rushKind,
  titleCaseToken,
} from '../core-api/services/plantDemo/planExplanation.js';

const refreshPlan = {
  lineId: 'line-1',
  eventType: 'queue_refresh',
  source: 'etl_refresh',
  planVersion: 4,
  queue: [
    {
      po: '1002408120',
      species: 'SWCO',
      kg: '6200',
      finish: '2026-07-07 08:00',
      status: 'PLANNED',
      atRisk: false,
      reasonShort: 'New active PO',
      previousPosition: null,
    },
  ],
  diff: {
    moves: [],
    reasons: ['queue_refresh_etl_refresh'],
    held: [],
    added: ['1002408120'],
    removed: [],
  },
};

describe('plan explanation', () => {
  it('treats a new COISPI order as a rush refresh for the scheduler', () => {
    expect(explainContextFromPlan(refreshPlan)).toMatchObject({
      uiEventType: 'rush',
      agentEventType: 'rush',
      trigger: 'sap_queue_refresh',
      focusPo: '1002408120',
    });
  });

  it('keeps a quality fail on the QA path', () => {
    expect(
      explainContextFromPlan(
        { eventType: 'qa_fail', source: 'pass_fail_log', diff: { held: ['1001884747'], moves: [] } },
        { failedFor: 'Discolored', focusPo: '1001884747' },
      ),
    ).toMatchObject({
      uiEventType: 'qa_fail',
      trigger: 'pass_fail_log',
      failedFor: 'Discolored',
      focusPo: '1001884747',
    });
  });

  it('marks a priority rush ahead of a note rush', () => {
    expect(rushKind([{ code: 'NOTE_RUSH' }, { code: 'RUSH_PRIORITY' }])).toBe('priority');
    expect(rushKind([{ code: 'NOTE_RUSH' }])).toBe('note');
    expect(normalizePlanQueue(
      [{ po: '1001', species: 'PECO', kg: 1, finish: '2026-10-02', status: 'PLANNED' }],
      {},
      { 1001: 'note' },
    )[0].rush).toBe('note');
    expect(normalizePlanQueue(
      [{ po: '1001', species: 'PECO', kg: 1, finish: '2026-10-02 18:00', status: 'PLANNED' }],
      {},
      {},
      { 1001: '2026-10-02T14:00:00-07:00' },
    )[0].start).toBe('2026-10-02 14:00');
  });

  it('normalizes a plan row and drops a false at-risk flag', () => {
    expect(normalizePlanQueue(refreshPlan.queue)[0]).toEqual({
      po: '1002408120',
      species: 'SWCO',
      kg: 6200,
      finish: '2026-07-07 08:00',
      status: 'PLANNED',
      reasonShort: 'New active PO',
    });
  });

  it('builds the poll payload with the simulated summary', async () => {
    const explained = await attachPlanExplanation(refreshPlan, { locale: 'en', focusPo: '1002408120' });
    const poll = queueResponseFromPlan(explained, explained.explanation);
    expect(poll.lastEvent).toBe('rush');
    expect(poll.planVersion).toBe(4);
    expect(poll.pendingDiff.added).toEqual(['1002408120']);
    expect(poll.pendingExplanation.summary).toMatch(/1002408120/);
    expect(poll.pendingExplanation.alertBanner).toMatch(/COISPI/);
  });

  it('quotes the rush move instead of always saying position 1', () => {
    const text = buildExplainReplan('en', 'rush', {
      focusPo: '1002266350',
      priority: 1,
      trigger: 'sap_priority_change',
      moves: [{ po: '1002266350', fromPosition: 8, toPosition: 2 }],
      queue: [
        { po: '1002267630', species: 'PECO', status: 'PLANNED' },
        { po: '1002266350', species: 'PECO', status: 'PLANNED' },
      ],
    });
    expect(text.summary).toBe('Moved PO 1002266350 from position 8 to position 2.');
    expect(text.bullets[0]).toBe('Moved PO 1002266350 from position 8 to position 2.');
    expect(text.bullets.join(' ')).toMatch(/PECO/);
    expect(text.bullets.join(' ')).not.toMatch(/position 1/);
  });

  it('describes an added PO by its new position, not by the next lot move', () => {
    const text = buildExplainReplan('en', 'queue_refresh', {
      focusPo: '1002408120',
      priority: 2,
      scheduledFinish: '2026-10-04',
      trigger: 'sap_queue_refresh',
      lineId: 'line-2',
      added: ['1002408120'],
      moves: [{ po: '1002300812', fromPosition: 11, toPosition: 12 }],
      queue: [
        { po: '1002266349', species: 'PECO', status: 'PLANNED' },
        { po: '1002408120', species: 'SWCO', status: 'PLANNED', finish: '2026-10-08 22:57' },
      ],
    });
    expect(text.alertBanner).toMatch(/Line 2/);
    expect(text.summary).toBe(
      'PO 1002408120 entered Line 2 at position 2, SAP due 2026-10-04, projected finish 2026-10-08.',
    );
    expect(text.bullets[0]).toBe('Added PO 1002408120 at position 2.');
    expect(text.bullets.join(' ')).not.toMatch(/position 11/);
  });

  it('title-cases a fail reason code', () => {
    expect(titleCaseToken('DISCOLORED')).toBe('Discolored');
  });

  it('names the moved order instead of an em dash', () => {
    const text = buildExplainReplan('es', 'rush', {
      focusPo: '—',
      moves: [{ po: '-', fromPosition: 4, toPosition: 2 }],
      added: [],
      held: ['PO'],
      queue: [
        { po: '1001759341', species: 'SWCO', status: 'PLANNED' },
        { po: '1002307551', species: 'SWCO', status: 'PLANNED', previousPosition: 4 },
      ],
    });
    expect(text.summary).toBe('PO 1002307551 quedó en la posición 2.');
    expect(text.summary).not.toMatch(/—/);
    expect(text.bullets.join(' ')).toMatch(/Señal de prioridad/);
    expect(text.bullets.join(' ')).toMatch(/Especie SWCO/);
    expect(text.bullets.join(' ')).toMatch(/Sin escritura ERP/);
  });

  it('does not invent an order number when none can be resolved', () => {
    const spanish = buildExplainReplan('es', 'rush', {
      focusPo: '—',
      moves: [],
      added: ['-'],
      held: [],
      queue: [{ po: '1001759341', species: 'SWCO', status: 'PLANNED' }],
    });
    expect(spanish.summary).toBe('Un lote se adelantó en la cola.');
    expect(spanish.bullets[0]).toBe('Un lote se adelantó en la cola.');
    expect(spanish.summary).not.toMatch(/PO/);
    expect(spanish.bullets.join(' ')).toMatch(/Changeover según la especie/);
    expect(spanish.bullets.join(' ')).toMatch(/Sin escritura ERP/);

    const english = buildExplainReplan('en', 'rush', {
      focusPo: '',
      moves: [{ po: '—' }],
      queue: [],
    });
    expect(english.summary).toBe('A batch moved ahead in the queue.');
    expect(english.bullets[0]).toBe('A batch moved ahead in the queue.');
    expect(english.summary).not.toMatch(/PO —/);
    expect(english.bullets.join(' ')).toMatch(/SAP finish \/ priority signal applied/);
    expect(english.bullets.join(' ')).toMatch(/No ERP write/);
  });

  it('uses the first order after the running row when that is the only signal', () => {
    const text = buildExplainReplan('en', 'rush', {
      queue: [
        { po: '1001759341', status: 'PLANNED' },
        { po: '1002266350', status: 'PLANNED', species: 'PECO' },
      ],
    });
    expect(text.summary).toBe('PO 1002266350 is at position 2.');
    expect(text.summary).not.toMatch(/1001759341/);
  });
});
