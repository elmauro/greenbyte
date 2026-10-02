import { parseAccept, parseNewPo, parsePassFail, parsePriorityChange, SapIngestError } from '../core-api/services/plantDemo/sapIngestDb.js';

describe('sap ingest body', () => {
  it('accepts a priority or a finish date on an existing PO', () => {
    expect(parsePriorityChange({ po: '1002266350', priority: 2 }).priority).toBe(2);
    expect(parsePriorityChange({ po: '1002266350', scheduledFinish: '2026-10-01 08:00' }).scheduledFinish).toBe('2026-10-01');
    expect(parsePriorityChange({ po: '1002266350', priority: 1, rush: true }).rush).toBe(true);
    expect(parsePriorityChange({ po: '1002266350', priority: 1 }).rush).toBe(false);
  });

  it('rejects an urgency with neither priority nor date', () => {
    expect(() => parsePriorityChange({ po: '1002266350' })).toThrow(SapIngestError);
  });

  it('parses a new COISPI PO', () => {
    const parsed = parseNewPo({
      lineId: 'line-2',
      po: '1002408120',
      species: 'swco',
      kg: 6200,
      priority: 2,
      scheduledFinish: '2026-07-07',
    });
    expect(parsed).toMatchObject({
      lineId: 'line-2',
      po: '1002408120',
      species: 'SWCO',
      kg: 6200,
      priority: 2,
      scheduledFinish: '2026-07-07',
    });
  });

  it('parses a Fail on an existing lot', () => {
    expect(parsePassFail({
      lineId: 'line-1',
      po: '1002266350',
      passFail: 'Fail',
      failedFor: 'Dent',
    })).toMatchObject({
      lineId: 'line-1',
      po: '1002266350',
      passFail: 'Fail',
      failedFor: 'Dent',
      equipmentId: 'Line 1',
    });
  });

  it('requires species for a new PO', () => {
    expect(() => parseNewPo({ po: '1002408120' })).toThrow(/species/);
  });

  it('parses a human accept with an optional version and comment', () => {
    expect(parseAccept({ lineId: 'line-2', planVersion: 3, comment: ' ok ' })).toMatchObject({
      lineId: 'line-2',
      planVersion: 3,
      comment: 'ok',
    });
    expect(parseAccept({})).toMatchObject({ lineId: 'line-1', planVersion: null, comment: null });
  });

  it('rejects a non-integer plan version', () => {
    expect(() => parseAccept({ planVersion: 1.5 })).toThrow(/planVersion/);
  });
});
