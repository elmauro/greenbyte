import {
  dataReplanRequestFromPassFailIngest,
  dataReplanRequestFromSapIngest,
  dataReplanRequestFromSapQueueRefresh,
} from '../core-api/services/plantDemo/ingestToDataReplan.js';

describe('BFF ingest → Data API replan request', () => {
  it('maps SAP priority ingest to Camilo replan shape', () => {
    const req = dataReplanRequestFromSapIngest({
      po: '1002307551',
      priority: 2,
      scheduledFinish: '2026-07-06 09:00',
      locale: 'es',
    });
    expect(req.type).toBe('rush');
    expect(req.trigger).toBe('priority_change');
    expect(req.focusPo).toBe('1002307551');
    expect(req.ingest.source).toBe('sap_priority_change');
    expect(req.locale).toBe('es');
  });

  it('maps pass/fail ingest to Camilo replan shape', () => {
    const req = dataReplanRequestFromPassFailIngest({
      po: '1001884747',
      passFail: 'Fail',
      failedFor: 'Dent',
      equipmentId: 'Line 1',
    });
    expect(req.type).toBe('qa_fail');
    expect(req.trigger).toBe('pass_fail_log');
    expect(req.focusPo).toBe('1001884747');
    expect(req.ingest.passFail).toBe('Fail');
  });

  it('maps SAP queue refresh ingest', () => {
    const req = dataReplanRequestFromSapQueueRefresh({ po: '1002408120', priority: 2 });
    expect(req.trigger).toBe('sap_queue_refresh');
    expect(req.focusPo).toBe('1002408120');
    expect(req.ingest.source).toBe('sap_queue_refresh');
  });
});
