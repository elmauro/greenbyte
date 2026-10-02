import { useEffect, useMemo, useRef, useState } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { plantDemoApi } from '../../services/plantDemoApi';
import { PlantSelect } from './PlantSelect';

const THREAD_KEY = 'greenbyte-schedule-copilot-threads-v1';
const MAX_TURNS = 16;

type CopilotTurn = {
  role: 'user' | 'copilot';
  text: string;
  citations?: string[];
};

type PlantCopilotThreadProps = {
  queue: QueueRow[];
  focusPo?: string;
  onPoChange?: (po: string) => void;
};

function readThreads(): Record<string, CopilotTurn[]> {
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
        const next: CopilotTurn = { role: row.role, text: row.text, citations };
        return [next];
      });
      if (turns.length) threads[order] = turns.slice(-MAX_TURNS);
    }
    return threads;
  } catch {
    return {};
  }
}

function writeThreads(threads: Record<string, CopilotTurn[]>) {
  try {
    sessionStorage.setItem(THREAD_KEY, JSON.stringify(threads));
  } catch {
    /* quota or private mode: the thread still shows for this view */
  }
}

function plainText(value: string) {
  return value.replace(/\*\*(.*?)\*\*/g, '$1');
}

/** Chat for one production order. The thread is kept for the browser session. */
export function PlantCopilotThread({ queue, focusPo, onPoChange }: PlantCopilotThreadProps) {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp.salesChat;
  const shell = m.plantMvp.scheduleShell;
  const selectable = useMemo(() => queue.filter((row) => row.status !== 'COMPLETE'), [queue]);
  const [po, setPo] = useState(() =>
    focusPo && selectable.some((row) => row.po === focusPo) ? focusPo : '',
  );
  const [threads, setThreads] = useState(readThreads);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const selected = selectable.find((row) => row.po === po) ?? null;
  const position = selected ? queue.findIndex((row) => row.po === selected.po) + 1 : 0;
  const turns = po ? (threads[po] ?? []) : [];

  useEffect(() => {
    if (!focusPo || focusPo === po) return;
    if (!selectable.some((row) => row.po === focusPo)) return;
    setPo(focusPo);
    setQuestion('');
  }, [focusPo, selectable, po]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [po, turns.length, busy]);

  function remember(order: string, turn: CopilotTurn) {
    setThreads((prev) => {
      const next = {
        ...prev,
        [order]: [...(prev[order] ?? []), turn].slice(-MAX_TURNS),
      };
      writeThreads(next);
      return next;
    });
  }

  async function ask(preset?: string) {
    const asked = (preset ?? question).trim();
    const order = po;
    if (!order || !asked || busy) return;
    remember(order, { role: 'user', text: asked });
    if (!preset) setQuestion('');
    setBusy(true);
    try {
      const res = await plantDemoApi.postBatchExplain(order, asked, locale);
      remember(order, {
        role: 'copilot',
        text: plainText(res.answer),
        citations: res.citations,
      });
    } catch {
      remember(order, { role: 'copilot', text: copy.askError });
    } finally {
      setBusy(false);
    }
  }

  function choosePo(next: string) {
    setPo(next);
    setQuestion('');
    onPoChange?.(next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-gray-100 px-3 py-2">
        <label htmlFor="explain-po-rail" className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {shell.thisOrder}
        </label>
        <PlantSelect
          id="explain-po-rail"
          className="mt-1 w-full"
          size="sm"
          value={po}
          onChange={choosePo}
          options={selectable.map((row) => ({
            value: row.po,
            label: `${row.po} · ${row.species}`,
          }))}
        />
        {selected && (
          <p className="mt-1 truncate text-[11px] text-gray-500">
            {shell.queuePosition.replace('{n}', String(position))}
            {' · '}
            {selected.kg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} kg
            {' · '}
            {selected.finish}
            {selected.status === 'HOLD' ? ` · ${shell.holdShort}` : ''}
          </p>
        )}
      </div>

      <div
        ref={logRef}
        data-copilot-log
        aria-live="polite"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
      >
        {turns.length === 0 && !busy ? (
          <p className="text-sm leading-relaxed text-gray-600">{copy.railPrompt}</p>
        ) : (
          turns.map((turn, index) => (
            <article
              key={`${turn.role}-${index}-${turn.text.slice(0, 24)}`}
              aria-label={turn.role === 'user' ? copy.youLabel : copy.copilotLabel}
              className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                turn.role === 'user'
                  ? 'ml-auto rounded-br-sm bg-brand-green text-white'
                  : 'mr-auto rounded-bl-sm border border-gray-200 bg-white text-gray-800'
              }`}
            >
              <p>{turn.text}</p>
              {turn.citations && turn.citations.length > 0 && (
                <p className={`mt-1 text-[11px] ${turn.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                  {copy.citationsLabel}: {turn.citations.join(' · ')}
                </p>
              )}
            </article>
          ))
        )}
        {busy && <p className="text-xs text-gray-500">{copy.thinking}</p>}
      </div>

      <form
        className="shrink-0 border-t border-gray-200 bg-white px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <div className="flex flex-wrap gap-1.5">
          {copy.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy || !po}
              onClick={() => void ask(prompt)}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-brand-green/40 hover:text-brand-green-dark disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={copy.inputPlaceholder}
            className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !po || !question.trim()}
            className="shrink-0 rounded-lg bg-brand-green px-3 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
          >
            {copy.askButton}
          </button>
        </div>
      </form>
    </div>
  );
}
