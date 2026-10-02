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

/** One copilot turn. A rush instruction also posts the SAP priority change. */
export async function askCopilot(input: {
  po: string;
  question: string;
  locale: Locale;
  lineId?: string;
  history: { role: 'user' | 'copilot'; text: string }[];
  onQueueRefresh?: () => void | Promise<void>;
  rushError: string;
}): Promise<CopilotTurn> {
  const res = await plantDemoApi.postBatchExplain(input.po, input.question, input.locale, {
    lineId: input.lineId,
    history: input.history,
  });
  let text = res.answer;
  if (res.action === 'rush') {
    try {
      await plantDemoApi.sendCopilotRush(input.locale, input.lineId, input.po);
      await input.onQueueRefresh?.();
    } catch {
      text = input.rushError;
    }
  }
  return {
    role: 'copilot',
    text: plainCopilotText(text),
    citations: res.citations,
  };
}
