const DEFAULT_LINE_ID = 'line-1';

const keyForLine = (lineId: string) => `plant-demo-ack-${lineId}`;

export function readAckPlanVersion(lineId: string = DEFAULT_LINE_ID): number | null {
  try {
    const raw = sessionStorage.getItem(keyForLine(lineId));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeAckPlanVersion(lineId: string, version: number | null): void {
  try {
    const key = keyForLine(lineId);
    if (version == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, String(version));
  } catch {
    /* private mode / SSR */
  }
}

export function mergeAckPlanVersion(
  local: number | null,
  server: number | null | undefined,
): number | null {
  if (local == null) return server ?? null;
  if (server == null) return local;
  return Math.max(local, server);
}

export function isPlanAcknowledged(planVersion: number, ack: number | null): boolean {
  return ack != null && planVersion <= ack;
}
