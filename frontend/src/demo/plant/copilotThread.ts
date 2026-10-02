import type { Locale } from '../../i18n/LocaleContext';
import { plantDemoApi } from '../../services/plantDemoApi';

const THREAD_KEY = 'greenbyte-schedule-copilot-threads-v1';
const MAX_TURNS = 16;

export type CopilotTurn = {
  role: 'user' | 'copilot';
  text: string;
  citations?: string[];
};

export function readCopilotThreads(): Record<string, CopilotTurn[]> {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const threads: Record<string, CopilotTurn[]> = {};
    for (const [order, value] of Object.entries(parsed)) {
      if (!Array.isArray(value)) continue;
      const turns = value.flatMap((turn) => {
        if (!turn || typeof turn !== 'object') return [];
        const row = turn as { role?: unknown; text?: unknown; citations?: unknown };
        if ((row.role !== 'user' && row.role !== 'copilot') || typeof row.text !== 'string') return [];
        const citations = Array.isArray(row.citations)
          ? row.citations.filter((item): item is string => typeof item === 'string')
          : undefined;
        return [{ role: row.role, text: row.text, citations } satisfies CopilotTurn];
      });
      if (turns.length) threads[order] = turns.slice(-MAX_TURNS);
    }
    return threads;
  } catch {
    return {};
  }
}

export function writeCopilotThreads(threads: Record<string, CopilotTurn[]>) {
  try {
    sessionStorage.setItem(THREAD_KEY, JSON.stringify(threads));
  } catch {
    /* quota or private mode: the thread still shows for this view */
  }
}

const THREADS_CLEARED = 'greenbyte-copilot-threads-cleared';

/** Drops every order's copilot thread. Open chats hear the same event. */
export function clearCopilotThreads() {
  writeCopilotThreads({});
  window.dispatchEvent(new Event(THREADS_CLEARED));
}

export function subscribeCopilotThreads(onChange: () => void) {
  window.addEventListener(THREADS_CLEARED, onChange);
  return () => window.removeEventListener(THREADS_CLEARED, onChange);
}

export function appendCopilotTurn(
  threads: Record<string, CopilotTurn[]>,
  po: string,
  turn: CopilotTurn,
): Record<string, CopilotTurn[]> {
  return {
    ...threads,
    [po]: [...(threads[po] ?? []), turn].slice(-MAX_TURNS),
  };
}

export function plainCopilotText(value: string) {
  return value.replace(/\*\*(.*?)\*\*/g, '$1');
}

let queueHold = 0;

/** The 5s queue poll must not move a row while a rush replan is still running. */
export function holdQueueUpdates() {
  queueHold += 1;
}

export function releaseQueueUpdates() {
  queueHold = Math.max(0, queueHold - 1);
}

export function queueUpdatesHeld() {
  return queueHold > 0;
}

function afterPaint() {
  if (typeof requestAnimationFrame !== 'function') return Promise.resolve();
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** One copilot turn. A rush instruction also posts the SAP priority change. */
export async function askCopilot(input: {
  po: string;
  question: string;
  locale: Locale;
  lineId?: string;
  history: { role: 'user' | 'copilot'; text: string }[];
  onQueueRefresh?: () => void | Promise<void>;
  onReplanning?: (kind: 'rush' | 'hold') => void;
  rushError: string;
  failError: string;
}): Promise<CopilotTurn> {
  const res = await plantDemoApi.postBatchExplain(input.po, input.question, input.locale, {
    lineId: input.lineId,
    history: input.history,
  });
  let text = res.answer;
  if (res.action === 'rush' || (res.action === 'qa_fail' && res.failedFor)) {
    const kind = res.action === 'qa_fail' ? 'hold' : 'rush';
    holdQueueUpdates();
    input.onReplanning?.(kind);
    try {
      await afterPaint();
      if (kind === 'hold') {
        await plantDemoApi.sendCopilotFail(input.locale, input.lineId, input.po, res.failedFor as string);
      } else {
        await plantDemoApi.sendCopilotRush(input.locale, input.lineId, input.po);
      }
      await input.onQueueRefresh?.();
    } catch {
      text = kind === 'hold' ? input.failError : input.rushError;
    } finally {
      releaseQueueUpdates();
    }
  }
  return {
    role: 'copilot',
    text: plainCopilotText(text),
    citations: res.citations,
  };
}
