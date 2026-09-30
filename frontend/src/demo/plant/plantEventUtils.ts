import type { PlantEventType, PlantPlanDiff, QueueRow } from './plantDemoTypes';

/** Demo anchors in Pasco mock — ingest defaults; BFF may use any PO in queue. */
export const DEFAULT_DEMO_RUSH_PO = '1002307551';
export const DEFAULT_DEMO_QA_FAIL_PO = '1001884747';

/**
 * PO to highlight on Gantt / scheduling when a replan is pending.
 * Prefer Agent/Data API diff; fall back to HOLD row or first move.
 */
export function primaryPoFromPending(
  eventType: PlantEventType | null | undefined,
  diff: PlantPlanDiff | null | undefined,
  queue: QueueRow[],
): string | undefined {
  const firstMove = diff?.moves?.[0]?.po;
  if (firstMove) return firstMove;

  if (eventType === 'qa_fail') {
    const held = queue.find((r) => r.status === 'HOLD');
    if (held) return held.po;
  }

  if (eventType === 'rush') {
    const moved = queue.find((r) => r.previousPosition != null && r.status === 'PLANNED');
    if (moved) return moved.po;
  }

  return undefined;
}
