export type PlantUxHistoryEntry = {
  kind: 'priority' | 'quality';
  at: string;
};

const KEY = 'greenbyte-plant-ux-approval-history-v1';

export function readPlantUxApprovalHistory(): PlantUxHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlantUxHistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendPlantUxApprovalHistory(kind: 'priority' | 'quality'): PlantUxHistoryEntry[] {
  const entry: PlantUxHistoryEntry = { kind, at: new Date().toISOString() };
  const next = [entry, ...readPlantUxApprovalHistory()].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
