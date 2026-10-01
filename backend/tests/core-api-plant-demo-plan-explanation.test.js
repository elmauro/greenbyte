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

  it('title-cases a fail reason code', () => {
    expect(titleCaseToken('DISCOLORED')).toBe('Discolored');
  });
});
