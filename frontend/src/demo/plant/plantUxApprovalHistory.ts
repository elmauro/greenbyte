import {
  DEFAULT_DEMO_QA_FAIL_PO,
  DEFAULT_DEMO_RUSH_PO,
} from './plantEventUtils';
import { PLANT_DEMO_LINE_ID } from './plantDemoServer';

export type PlantUxHistoryKind = 'priority' | 'quality';

export type PlantUxHistoryEntry = {
  id: string;
  kind: PlantUxHistoryKind;
  po: string;
  lineId: string;
  at: string;
};

const KEY_V2 = 'greenbyte-plant-ux-approval-history-v2';
const KEY_V1 = 'greenbyte-plant-ux-approval-history-v1';
const MAX_ENTRIES = 20;
const DEDUPE_WINDOW_MS = 30_000;

type LegacyEntry = { kind?: PlantUxHistoryKind; at?: string };

function defaultPo(kind: PlantUxHistoryKind): string {
  return kind === 'priority' ? DEFAULT_DEMO_RUSH_PO : DEFAULT_DEMO_QA_FAIL_PO;
}

function normalizeEntry(raw: unknown): PlantUxHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const kind = row.kind === 'priority' || row.kind === 'quality' ? row.kind : null;
  const at = typeof row.at === 'string' ? row.at : null;
  if (!kind || !at) return null;
  const po =
    typeof row.po === 'string' && row.po.trim().length > 0 ? row.po.trim() : defaultPo(kind);
  const lineId =
    typeof row.lineId === 'string' && row.lineId.trim().length > 0
      ? row.lineId.trim()
      : PLANT_DEMO_LINE_ID;
  const id =
    typeof row.id === 'string' && row.id.length > 0
      ? row.id
      : `${at}-${kind}-${po}-${lineId}`;
  return { id, kind, po, lineId, at };
}

function migrateV1IfNeeded(): PlantUxHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyEntry[];
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed
      .map((item) =>
        normalizeEntry({
          kind: item.kind,
          at: item.at,
          po: item.kind ? defaultPo(item.kind) : undefined,
          lineId: PLANT_DEMO_LINE_ID,
        }),
      )
      .filter((e): e is PlantUxHistoryEntry => e != null);
    localStorage.removeItem(KEY_V1);
    if (migrated.length > 0) {
      localStorage.setItem(KEY_V2, JSON.stringify(migrated.slice(0, MAX_ENTRIES)));
    }
    return migrated;
  } catch {
    return [];
  }
}

export function readPlantUxApprovalHistory(): PlantUxHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY_V2);
    if (!raw) return migrateV1IfNeeded();
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((e): e is PlantUxHistoryEntry => e != null)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  } catch {
    return [];
  }
}

export function appendPlantUxApprovalHistory(input: {
  kind: PlantUxHistoryKind;
  po?: string;
  lineId: string;
}): PlantUxHistoryEntry[] {
  const po = input.po?.trim() || defaultPo(input.kind);
  const at = new Date().toISOString();
  const prev = readPlantUxApprovalHistory();
  const latest = prev[0];
  if (
    latest &&
    latest.kind === input.kind &&
    latest.po === po &&
    latest.lineId === input.lineId &&
    Date.parse(at) - Date.parse(latest.at) < DEDUPE_WINDOW_MS
  ) {
    return prev;
  }

  const entry: PlantUxHistoryEntry = {
    id: `${at}-${crypto.randomUUID()}`,
    kind: input.kind,
    po,
    lineId: input.lineId,
    at,
  };
  const next = [entry, ...prev].slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY_V2, JSON.stringify(next));
  return next;
}

/** Calendar label for history rows (today / yesterday / date + time). */
export function formatPlantHistoryWhen(
  iso: string,
  locale: 'en' | 'es',
  copy: { todayAt: string; yesterdayAt: string; onDate: string },
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const loc = locale === 'es' ? 'es-ES' : 'en-US';
  const time = d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const dayMs = 86_400_000;
  const diffDays = Math.round((startOf(new Date()).getTime() - startOf(d).getTime()) / dayMs);
  if (diffDays === 0) return copy.todayAt.replace('{t}', time);
  if (diffDays === 1) return copy.yesterdayAt.replace('{t}', time);
  const date = d.toLocaleDateString(loc, { month: 'short', day: 'numeric', year: 'numeric' });
  return copy.onDate.replace('{date}', date).replace('{t}', time);
}
