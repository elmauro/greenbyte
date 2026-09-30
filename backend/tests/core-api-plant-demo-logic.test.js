import { applyEvent, createBaselineState, getQueueResponse } from '../core-api/services/plantDemo/logic.js';

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

  it('rejects unknown line', () => {
    const state = createBaselineState();
    expect(() => getQueueResponse(state, 'line-99')).toThrow('Unknown line');
  });
});
