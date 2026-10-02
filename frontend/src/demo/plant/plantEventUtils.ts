import type { PlantEventType, PlantExplanation, PlantPlanDiff, QueueRow } from './plantDemoTypes';

/** Demo anchors in Pasco mock — ingest defaults; BFF may use any PO in queue. */
export const DEFAULT_DEMO_RUSH_PO = '1002307551';
export const DEFAULT_DEMO_QA_FAIL_PO = '1001884747';

/** Slot-0 batch already on the line — not the Syngenta “rush / new PO” highlight target. */
export function poAtRunningSlot(queue: QueueRow[]): string | undefined {
  const head = queue[0];
  if (!head?.po) return undefined;
  const reason = head.reasonShort ?? '';
  if (/already running/i.test(reason)) return head.po;
  return undefined;
}

function poFromDiffMoves(
  diff: PlantPlanDiff | null | undefined,
  queue: QueueRow[],
): string | undefined {
  const running = poAtRunningSlot(queue);
  for (const move of diff?.moves ?? []) {
    const po = move?.po?.trim();
    if (!po || po === running) continue;
    return po;
  }
  return undefined;
}

function poFromQueueMoveFallback(queue: QueueRow[]): string | undefined {
  const running = poAtRunningSlot(queue);
  const moved = queue.find((row, index) => {
    if (index === 0 || row.po === running) return false;
    if (row.status !== 'PLANNED') return false;
    const previous = row.previousPosition;
    return previous != null && previous !== index + 1;
  });
  return moved?.po;
}

/**
 * PO to highlight on Gantt / scheduling when a replan is pending.
 * Syngenta: highlight the batch that moved, was added, or went on QA hold — not the running head.
 */
export function primaryPoFromPending(
  eventType: PlantEventType | null | undefined,
  diff: PlantPlanDiff | null | undefined,
  queue: QueueRow[],
): string | undefined {
  if (eventType === 'qa_fail') {
    const held = queue.find((r) => r.status === 'HOLD');
    if (held) return held.po;
    if (diff?.held?.[0]) return diff.held[0];
  }

  const added = diff?.added?.[0]?.trim();
  if (added) return added;

  const movePo = poFromDiffMoves(diff, queue);
  if (movePo) return movePo;

  if (eventType === 'rush') {
    return poFromQueueMoveFallback(queue);
  }

  return poFromQueueMoveFallback(queue);
}

const PLACEHOLDER_ORDER = new Set(['—', '–', '-', 'PO']);

/** Dash standing in for a missing order number: "PO —", "Moved PO —", "PO — se adelantó". */
const MISSING_PO_DASH = /PO\s*[\u002D\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/;

function explanationLines(explanation: PlantExplanation | null | undefined): string[] {
  if (!explanation) return [];
  return [explanation.alertBanner, explanation.summary, ...(explanation.bullets ?? [])].filter(
    (line): line is string => typeof line === 'string',
  );
}

/** Summary or bullets still say the order number is missing. */
export function explanationIsMissingPoStub(explanation: PlantExplanation | null | undefined): boolean {
  if (!explanation) return false;
  return [explanation.summary, ...(explanation.bullets ?? [])].some(
    (line) => typeof line === 'string' && MISSING_PO_DASH.test(line),
  );
}

export function explanationNamesRealPo(explanation: PlantExplanation | null | undefined): boolean {
  return explanationLines(explanation).some((line) => /PO\s*\d{4,}/.test(line));
}

export function hasAlertBannerText(explanation: PlantExplanation | null | undefined): boolean {
  return Boolean(explanation?.alertBanner?.trim());
}

/** First real order number written in the explanation, when the diff has none. */
export function orderPoFromExplanation(explanation: PlantExplanation | null | undefined): string | undefined {
  for (const line of explanationLines(explanation)) {
    const match = line.match(/PO\s*(\d{4,})/);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * Bell, event line, banner, and copilot story.
 * A missing-PO stub with no order in the diff or the copy is not a notice.
 * A template alert banner does not keep that stub on screen.
 * A real notice remains when the copy names an order, the alert is present on a
 * non-stub explanation, or the diff records a moved, added, or held PO.
 */
export function shouldSurfacePendingNotice(
  explanation: PlantExplanation | null | undefined,
  diff: PlantPlanDiff | null | undefined,
  queue: QueueRow[],
): boolean {
  if (explainPoFromQueue(diff, queue) || explanationNamesRealPo(explanation)) return true;
  if (explanationIsMissingPoStub(explanation)) return false;
  return hasAlertBannerText(explanation);
}

function usableOrderPo(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const text = value.trim();
  if (!text || PLACEHOLDER_ORDER.has(text)) return undefined;
  return text;
}

/** PO for placeholder copy: added, held, moves, or a row that already moved. */
export function explainPoFromQueue(
  diff: PlantPlanDiff | null | undefined,
  queue: QueueRow[],
): string | undefined {
  const added = diff?.added?.map(usableOrderPo).find(Boolean);
  if (added) return added;
  const held = diff?.held?.map(usableOrderPo).find(Boolean);
  if (held) return held;
  const running = poAtRunningSlot(queue);
  for (const move of diff?.moves ?? []) {
    const po = usableOrderPo(move.po);
    if (po && po !== running) return po;
  }
  const rushed = poFromQueueMoveFallback(queue);
  if (rushed && usableOrderPo(rushed)) return rushed;
  return undefined;
}

/** Never render an em dash as if it were an order number. */
export function scrubPlaceholderOrder(
  explanation: PlantExplanation,
  po: string | undefined,
  locale: 'en' | 'es',
): PlantExplanation {
  const realPo = usableOrderPo(po);
  const dash = '[\\u002D\\u2010-\\u2015\\u2212\\uFE58\\uFE63\\uFF0D]';
  const rewrite = (line: string) => {
    const placeholder = new RegExp(`PO\\s*${dash}`);
    if (!placeholder.test(line)) return line;
    const placeholderGlobal = new RegExp(`PO\\s*${dash}`, 'g');
    if (realPo) return line.replace(placeholderGlobal, `PO ${realPo}`);
    if (locale === 'es') {
      return line
        .replace(new RegExp(`PO\\s*${dash}\\s*se adelantó en la cola\\.`, 'g'), 'Un lote se adelantó en la cola.')
        .replace(new RegExp(`PO\\s*${dash}`, 'g'), 'Un lote');
    }
    return line
      .replace(new RegExp(`Moved PO\\s*${dash}\\s*ahead in the queue\\.`, 'g'), 'A batch moved ahead in the queue.')
      .replace(new RegExp(`Moved PO\\s*${dash}`, 'g'), 'A batch')
      .replace(new RegExp(`PO\\s*${dash}`, 'g'), 'A batch');
  };
  return {
    ...explanation,
    alertBanner: rewrite(explanation.alertBanner ?? ''),
    summary: rewrite(explanation.summary ?? ''),
    bullets: (explanation.bullets ?? []).map(rewrite),
  };
}
