import { buildExplainReplan } from '../core-api/services/plantDemo/explanationBuilder.js';
import {
  attachPlanExplanation,
  explainContextFromPlan,
  normalizePlanQueue,
  queueResponseFromPlan,
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
});
