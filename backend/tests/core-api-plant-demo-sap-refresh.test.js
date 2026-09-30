import {
  applySapQueueRefresh,
  createBaselineState,
} from '../core-api/services/plantDemo/logic.js';

describe('sap queue refresh replan', () => {
  it('appends new PO and moves to head', () => {
    const state = createBaselineState();
    const { state: next, response } = applySapQueueRefresh(state, 'line-1', 'en', {
      po: '1002408120',
      priority: 2,
      scheduledFinish: '2026-07-07 08:00',
    });
    expect(next.queue[0].po).toBe('1002408120');
    expect(response.diff.reasons).toContain('sap_coispi_refresh');
    expect(response.diff.reasons).toContain('customer_order');
    expect(response.explanation.summary).toMatch(/1002408120/);
  });
});
