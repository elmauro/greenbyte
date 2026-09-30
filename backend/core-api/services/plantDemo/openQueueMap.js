/**
 * Maps a row from gold.v_open_queue onto the plant-demo queue contract.
 * Column names follow the UC1 model (process order + line schedule). Unknown
 * names are ignored; the first populated alias wins.
 */

const LINE_WORK_CENTERS = {
  'line-1': ['LSVLN1'],
  'line-2': ['LSVLN2'],
  'line-3': ['SSVLN3', 'SSVRPR3'],
  'line-5': ['SSVLN5', 'SSVRPR5'],
  'line-6': ['SSVLN6', 'SSVRPR6'],
  gravity: ['LSVGRVTY'],
  colorsort: ['LSVCLSRT'],
};

function lowered(row) {
  const out = {};
  for (const [key, value] of Object.entries(row ?? {})) {
    out[String(key).toLowerCase()] = value;
  }
  return out;
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value == null || value === '') return 0;
  const n = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function asFinish(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString();
    const dateOnly = value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0;
    return dateOnly ? iso.slice(0, 10) : iso.slice(0, 16).replace('T', ' ');
  }
  return String(value);
}

function mapStatus(value) {
  const status = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (status === 'COMPLETE' || status === 'COMPLETED' || status === 'FINISHED') return 'COMPLETE';
  if (status === 'HOLD' || status === 'ON_HOLD' || status === 'QA_HOLD') return 'HOLD';
  return 'PLANNED';
}

function asBool(value) {
  if (typeof value === 'boolean') return value;
  if (value == null || value === '') return false;
  const text = String(value).trim().toLowerCase();
  return text === 'true' || text === 't' || text === '1' || text === 'yes';
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {object | null}
 */
export function mapOpenQueueRow(raw) {
  const row = lowered(raw);
  const po = pick(row, ['po_number', 'po', 'prod_order', 'process_order', 'production_order']);
  if (po == null) return null;

  const slack = pick(row, ['slack_days', 'slack']);
  const atRisk =
    asBool(pick(row, ['is_at_risk', 'at_risk', 'atrisk'])) ||
    (slack != null && slack !== '' && asNumber(slack) < 0);

  const reason = pick(row, ['reason_short', 'reason', 'latest_fail_reason', 'priority_note', 'run_order_note', 'comments']);
  const runOrder = pick(row, ['run_order', 'position']);
  const lineKey = pick(row, ['demo_line_id', 'line_id', 'lineid']);
  const orderNumbers = pick(row, ['order_numbers', 'customer_order_id', 'customer_order', 'order_number']);
  const workCenter = pick(row, [
    'work_center_code',
    'workcenter',
    'work_center',
    'equipment_id',
    'line_code',
  ]);

  return {
    po: String(po).trim(),
    species: String(pick(row, ['species_code', 'species', 'crop']) ?? '').trim(),
    kg: asNumber(pick(row, ['input_kg', 'planned_output_qty', 'output_qty', 'kg'])),
    finish: asFinish(pick(row, ['scheduled_finish_date', 'sap_finish_date', 'finish', 'scheduled_finish'])),
    status: asBool(pick(row, ['is_hold']))
      ? 'HOLD'
      : mapStatus(pick(row, ['status_code', 'po_status', 'sap_status', 'status'])),
    ...(atRisk ? { atRisk: true } : {}),
    ...(reason != null ? { reasonShort: String(reason).slice(0, 160) } : {}),
    ...(orderNumbers != null
      ? {
          customerOrderId: Array.isArray(orderNumbers)
            ? orderNumbers.filter(Boolean).join(', ')
            : String(orderNumbers),
        }
      : {}),
    lineKey: lineKey != null ? String(lineKey).trim() : '',
    workCenter: workCenter != null ? String(workCenter).trim().toUpperCase() : '',
    runOrder: runOrder != null && runOrder !== '' ? asNumber(runOrder) : null,
  };
}

function toPublicRow(row) {
  const { lineKey, workCenter, runOrder, ...publicRow } = row;
  return publicRow;
}

/**
 * @param {Record<string, unknown>[]} rawRows
 * @param {string} lineId
 */
export function mapOpenQueue(rawRows, lineId) {
  const mapped = [];
  for (const raw of rawRows) {
    const row = mapOpenQueueRow(raw);
    if (row) mapped.push(row);
  }

  const hasLineSignal = mapped.some((row) => row.lineKey || row.workCenter);
  const want = String(lineId ?? '').trim();
  const wantCodes = (LINE_WORK_CENTERS[want] ?? [want.toUpperCase()]).map((code) => code.toUpperCase());

  let selected = mapped;
  if (hasLineSignal) {
    selected = mapped.filter((row) => {
      if (row.lineKey && row.lineKey.toLowerCase() === want.toLowerCase()) return true;
      if (row.workCenter && wantCodes.includes(row.workCenter)) return true;
      return false;
    });
  } else if (want !== 'line-1') {
    selected = [];
  }

  if (selected.some((row) => row.runOrder != null)) {
    selected.sort((a, b) => (a.runOrder ?? 9999) - (b.runOrder ?? 9999));
  }

  return selected.map(toPublicRow);
}
