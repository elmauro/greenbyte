export type PlantEventType = 'rush' | 'qa_fail';

export type QueueRow = {
  po: string;
  species: string;
  kg: number;
  finish: string;
  status: 'PLANNED' | 'COMPLETE' | 'HOLD';
  atRisk?: boolean;
};

export type QueueMove = {
  po: string;
  fromPosition: number;
  toPosition: number;
};

export type ReplanResult = {
  queue: QueueRow[];
  moves: QueueMove[];
  eventType: PlantEventType;
};

const BASE_QUEUE: QueueRow[] = [
  { po: '1001759341', species: 'SWCO', kg: 4200, finish: '2026-07-04 11:30', status: 'PLANNED' },
  { po: '1001858227', species: 'SWCO', kg: 3100, finish: '2026-07-05 16:00', status: 'PLANNED', atRisk: true },
  { po: '1002307551', species: 'SWCO', kg: 2800, finish: '2026-07-06 09:00', status: 'PLANNED', atRisk: true },
  { po: '1001984402', species: 'CORN', kg: 5100, finish: '2026-07-07 14:00', status: 'PLANNED' },
  { po: '1002011199', species: 'SWCO', kg: 3600, finish: '2026-07-08 10:00', status: 'PLANNED' },
  { po: '1001887703', species: 'SWCO', kg: 2900, finish: '2026-06-30 08:00', status: 'COMPLETE' },
];

export function getInitialQueue(): QueueRow[] {
  return BASE_QUEUE.map((row) => ({ ...row }));
}

function withPositions(queue: QueueRow[]): QueueRow[] {
  return queue;
}

/** Client-side stand-in until BFF + Data API replan is wired. */
export function applyDemoEvent(queue: QueueRow[], type: PlantEventType): ReplanResult {
  const next = queue.map((row) => ({ ...row }));
  const moves: QueueMove[] = [];

  if (type === 'rush') {
    const rushPo = '1002307551';
    const fromIdx = next.findIndex((r) => r.po === rushPo);
    const toIdx = 0;
    if (fromIdx > toIdx) {
      const [row] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, row);
      moves.push({ po: rushPo, fromPosition: fromIdx + 1, toPosition: toIdx + 1 });
    }
    return { queue: withPositions(next), moves, eventType: type };
  }

  const failPo = '1001858227';
  const failIdx = next.findIndex((r) => r.po === failPo);
  if (failIdx >= 0) {
    next[failIdx] = { ...next[failIdx], status: 'HOLD' };
    const [held] = next.splice(failIdx, 1);
    next.push(held);
    moves.push({ po: failPo, fromPosition: failIdx + 1, toPosition: next.length });
  }
  return { queue: withPositions(next), moves, eventType: type };
}

export function movedPoSet(moves: QueueMove[]): Set<string> {
  return new Set(moves.map((m) => m.po));
}
