import {
  acceptPlan,
  applyEvent,
  createBaselineState,
  getQueueResponse,
} from '../core-api/services/plantDemo/logic.js';

describe('plant demo logic', () => {
  it('returns baseline queue for line-1', () => {
    const state = createBaselineState();
    const res = getQueueResponse(state, 'line-1');
    expect(res.planVersion).toBe(1);
    expect(res.lastEvent).toBeNull();
    expect(res.queue).toHaveLength(6);
    expect(res.queue[2].po).toBe('1002307551');
  });

  it('rush moves PO 1002307551 to position 1', () => {
    const state = createBaselineState();
    const { state: next, response } = applyEvent(state, 'line-1', 'rush', 'en');
    expect(next.planVersion).toBe(2);
    expect(next.lastEvent).toBe('rush');
    expect(getQueueResponse(next, 'line-1').lastEvent).toBe('rush');
    expect(response.queue[0].po).toBe('1002307551');
    expect(response.diff.moves).toHaveLength(1);
    expect(response.explanation.summary).toMatch(/1002307551/);
  });

  it('qa_fail holds PO 1001884747 and resequences', () => {
    const state = createBaselineState();
    const { state: next, response } = applyEvent(state, 'line-1', 'qa_fail', 'en');
    const held = response.queue.find((r) => r.po === '1001884747');
    expect(held?.status).toBe('HOLD');
    expect(response.queue[response.queue.length - 1].po).toBe('1001884747');
    expect(next.lastEvent).toBe('qa_fail');
  });

  it('accept clears lastEvent on stored state', () => {
    const state = createBaselineState();
    const { state: afterRush } = applyEvent(state, 'line-1', 'rush', 'en');
    expect(afterRush.lastEvent).toBe('rush');
    const { state: afterAccept, response } = acceptPlan(afterRush, 'line-1');
    expect(afterAccept.lastEvent).toBeNull();
    expect(afterAccept.acceptedPlanVersion).toBe(2);
    expect(getQueueResponse(afterAccept, 'line-1').lastEvent).toBeNull();
    expect(response.planVersion).toBe(2);
  });

  it('GET queue hides lastEvent when plan was accepted even if lastEvent field stale', () => {
    const state = createBaselineState();
    const { state: afterQa } = applyEvent(state, 'line-1', 'qa_fail', 'en');
    const { state: afterAccept } = acceptPlan(afterQa, 'line-1');
    const stale = { ...afterAccept, lastEvent: 'qa_fail' };
    expect(getQueueResponse(stale, 'line-1').lastEvent).toBeNull();
  });

  it('rejects unknown line', () => {
    const state = createBaselineState();
    expect(() => getQueueResponse(state, 'line-99')).toThrow('Unknown line');
  });
});
