import { mapOpenQueue, mapOpenQueueRow, pendingQueue } from '../core-api/services/plantDemo/openQueueMap.js';

describe('gold.v_open_queue mapping', () => {
  it('maps a schedule row onto the queue contract', () => {
    const row = mapOpenQueueRow({
      po_number: '1002174855',
      species_code: 'SWCO',
      input_kg: '48400',
      scheduled_finish_date: '2026-07-10',
      status_code: 'RELEASED',
      work_center_code: 'LSVLN1',
      run_order: 2,
      priority_note: 'Customer window',
      customer_order_id: 'CO-51202',
      is_at_risk: false,
    });
    expect(row.po).toBe('1002174855');
    expect(row.species).toBe('SWCO');
    expect(row.kg).toBe(48400);
    expect(row.finish).toBe('2026-07-10');
    expect(row.status).toBe('PLANNED');
    expect(row.reasonShort).toBe('Customer window');
    expect(row.customerOrderId).toBe('CO-51202');
    expect(row.workCenter).toBe('LSVLN1');
  });

  it('keeps only the requested line and run order', () => {
    const queue = mapOpenQueue(
      [
        { po_number: '200', species: 'PECO', input_kg: 10, status_code: 'NEW', work_center_code: 'LSVLN2', run_order: 1 },
        { po_number: '100', species: 'SWCO', input_kg: 20, status_code: 'ONLINE', work_center_code: 'LSVLN1', run_order: 2 },
        { po_number: '101', species: 'SWCO', input_kg: 30, status_code: 'ON_HOLD', work_center_code: 'LSVLN1', run_order: 1 },
        { po_number: '102', species: 'SWCO', input_kg: 40, status_code: 'COMPLETE', work_center_code: 'LSVLN1', run_order: 3 },
      ],
      'line-1',
    );
    expect(queue.map((row) => row.po)).toEqual(['101', '100', '102']);
    expect(queue[0].status).toBe('HOLD');
    expect(queue[2].status).toBe('COMPLETE');
    expect(queue[0].workCenter).toBeUndefined();
  });

  it('filters by demo_line_id from gold.v_open_queue', () => {
    const queue = mapOpenQueue(
      [
        { po_number: '100', species_code: 'SWCO', input_kg: 1, status_code: 'NEW', demo_line_id: 'line-1', order_numbers: ['CO-1'] },
        { po_number: '200', species_code: 'PECO', input_kg: 2, status_code: 'NEW', demo_line_id: 'line-2', is_hold: true },
      ],
      'line-2',
    );
    expect(queue).toEqual([
      expect.objectContaining({ po: '200', status: 'HOLD' }),
    ]);
    const line1 = mapOpenQueue(
      [{ po_number: '100', species_code: 'SWCO', input_kg: 1, status_code: 'NEW', demo_line_id: 'line-1', order_numbers: ['CO-1', 'CO-2'] }],
      'line-1',
    );
    expect(line1[0].customerOrderId).toBe('CO-1, CO-2');
  });

  it('returns the whole view for line-1 when no line column is present', () => {
    const rows = [{ po_number: '100', species_code: 'SWCO', kg: 1, status: 'NEW' }];
    expect(mapOpenQueue(rows, 'line-1')).toHaveLength(1);
    expect(mapOpenQueue(rows, 'line-2')).toEqual([]);
  });

  it('shows an unplanned line as pending, without rush or plan reasons', () => {
    expect(pendingQueue([
      { po: '100', species: 'SWCO', kg: 10, finish: '2026-11-01', status: 'HOLD', atRisk: true, rush: 'priority', reasonShort: 'Rush: priority 7 → 1 (SAP change)', aiNote: 'Late.' },
      { po: '101', species: 'PECO', kg: 20, finish: '2026-11-02', status: 'PLANNED', customerOrderId: 'CO-1' },
    ])).toEqual([
      { po: '100', species: 'SWCO', kg: 10, finish: '2026-11-01', status: 'PENDING' },
      { po: '101', species: 'PECO', kg: 20, finish: '2026-11-02', status: 'PENDING', customerOrderId: 'CO-1' },
    ]);
  });

  it('drops rows that have no process order', () => {
    expect(mapOpenQueueRow({ species_code: 'SWCO' })).toBeNull();
  });
});
