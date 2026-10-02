import type { QueueRow } from './plantDemoTypes';
import type { Locale } from '../../i18n/LocaleContext';

const STORAGE_KEY = 'greenbyte-manual-order-v1';

export type ManualOrderRecord = {
  lineId: string;
  planVersion: number;
  /** Production orders in the order the scheduler chose, excluding completed rows. */
  order: string[];
  /** Position (1-based) of each PO when the manual edit started. */
  baseline: Record<string, number>;
  originalReason: Record<string, string | undefined>;
  originalPrevious: Record<string, number | undefined>;
};

export function manualSchedulerReason(locale: Locale): string {
  return locale === 'es' ? 'Lo movió el planificador' : 'Moved by the scheduler';
}

export function clearManualOrder() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Schedule line badge in queue tables (hidden on calm baseline v1 after demo reset). */
export function shouldShowScheduleLineNumber(
  planVersion: number,
  eventPendingReview: boolean,
  row: QueueRow,
  linePosition: number,
  locale: Locale,
): boolean {
  if (eventPendingReview) return true;
  if (planVersion > 1) return true;
  const reason = manualSchedulerReason(locale);
  return (
    row.reasonShort === reason &&
    row.previousPosition != null &&
    row.previousPosition !== linePosition
  );
}

export function readManualOrder(lineId: string, planVersion: number): ManualOrderRecord | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualOrderRecord;
    if (
      parsed.lineId !== lineId ||
      parsed.planVersion !== planVersion ||
      !Array.isArray(parsed.order) ||
      !parsed.baseline ||
      !parsed.originalReason
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeManualOrder(record: ManualOrderRecord) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

/** Puts the scheduler's order on top of a fresh queue snapshot. Completed rows stay at the end. */
export function applyManualOrder(rows: QueueRow[], record: ManualOrderRecord, locale: Locale): QueueRow[] {
  const byPo = new Map(rows.map((row) => [row.po, row]));
  const used = new Set<string>();
  const ordered: QueueRow[] = [];
  for (const po of record.order) {
    const row = byPo.get(po);
    if (!row || row.status === 'COMPLETE' || used.has(po)) continue;
    ordered.push(row);
    used.add(po);
  }
  for (const row of rows) {
    if (row.status !== 'COMPLETE' && !used.has(row.po)) ordered.push(row);
  }
  const complete = rows.filter((row) => row.status === 'COMPLETE');
  const reason = manualSchedulerReason(locale);
  const visible = ordered.map((row, index) => {
    const position = index + 1;
    const baseline = record.baseline[row.po];
    const moved = baseline != null && baseline !== position && row.status !== 'HOLD';
    return {
      ...row,
      previousPosition: moved ? baseline : undefined,
      reasonShort: moved ? reason : record.originalReason[row.po],
    };
  });
  return [...visible, ...complete];
}

export function rememberManualOrder(
  lineId: string,
  planVersion: number,
  rows: QueueRow[],
  order: string[],
): ManualOrderRecord {
  const existing = readManualOrder(lineId, planVersion);
  const visible = rows.filter((row) => row.status !== 'COMPLETE');
  const baseline =
    existing?.baseline ?? Object.fromEntries(visible.map((row, index) => [row.po, index + 1]));
  const originalReason =
    existing?.originalReason ?? Object.fromEntries(visible.map((row) => [row.po, row.reasonShort]));
  const originalPrevious =
    existing?.originalPrevious ??
    Object.fromEntries(visible.map((row) => [row.po, row.previousPosition]));
  const record: ManualOrderRecord = {
    lineId,
    planVersion,
    order,
    baseline,
    originalReason,
    originalPrevious,
  };
  writeManualOrder(record);
  return record;
}
