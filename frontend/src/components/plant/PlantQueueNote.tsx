import { useEffect, useRef, useState } from 'react';
import {
  appendCopilotTurn,
  askCopilot,
  readCopilotThreads,
  subscribeCopilotThreads,
  writeCopilotThreads,
  type CopilotTurn,
} from '../../demo/plant/copilotThread';
import type { Locale } from '../../i18n/LocaleContext';

type PlantQueueNoteProps = {
  po: string;
  lineId?: string;
  locale: Locale;
  onQueueRefresh?: () => void | Promise<void>;
  copy: {
    youLabel: string;
    copilotLabel: string;
    thinking: string;
    replanning: string;
    askError: string;
    rushError: string;
    failError: string;
    holding: string;
    citationsLabel: string;
    noteEmpty: string;
    notePlaceholder: string;
    noteSend: string;
    noteSending: string;
    quickPrompts: string[];
  };
};

/** Notes on one queue row. The same thread the copilot tab reads. */
export function PlantQueueNote({ po, lineId, locale, onQueueRefresh, copy }: PlantQueueNoteProps) {
  const [threads, setThreads] = useState(readCopilotThreads);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'thinking' | 'replanning' | 'holding'>('thinking');
  const liveRef = useRef<HTMLDivElement>(null);
  const turns = threads[po] ?? [];

  useEffect(() => subscribeCopilotThreads(() => {
    setThreads({});
    setDraft('');
  }), []);

  useEffect(() => {
    liveRef.current?.scrollIntoView({ block: 'nearest' });
  }, [turns.length, busy]);

  function remember(turn: CopilotTurn) {
    const next = appendCopilotTurn(readCopilotThreads(), po, turn);
    writeCopilotThreads(next);
    setThreads(next);
  }

  async function send(text: string) {
    const asked = text.trim();
    if (!asked || busy) return;
    const history = (threads[po] ?? []).slice(-4).map((turn) => ({ role: turn.role, text: turn.text }));
    remember({ role: 'user', text: asked });
    setDraft('');
    setBusy(true);
    setPhase('thinking');
    try {
      remember(await askCopilot({
        po,
        question: asked,
        locale,
        lineId,
        history,
        onQueueRefresh,
        onReplanning: (kind) => setPhase(kind === 'hold' ? 'holding' : 'replanning'),
        rushError: copy.rushError,
        failError: copy.failError,
      }));
    } catch {
      remember({ role: 'copilot', text: copy.askError });
    } finally {
      setBusy(false);
      setPhase('thinking');
    }
  }

  return (
    <div className="bg-gray-50 px-4 py-3">
      <div ref={liveRef} aria-live="polite" className="space-y-2">
        {turns.length === 0 && !busy && (
          <p className="text-sm text-gray-600">{copy.noteEmpty}</p>
        )}
        {turns.map((turn, index) => (
          <article
            key={`${turn.role}-${index}-${turn.text.slice(0, 24)}`}
            className={`max-w-[40rem] rounded-2xl px-3 py-2 text-sm leading-snug ${
              turn.role === 'user'
                ? 'ml-auto rounded-br-sm bg-brand-green text-white'
                : 'mr-auto rounded-bl-sm border border-gray-200 bg-white text-gray-800'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${turn.role === 'user' ? 'text-white/80' : 'text-gray-400'}`}>
              {turn.role === 'user' ? copy.youLabel : copy.copilotLabel}
            </p>
            <p className="mt-0.5">{turn.text}</p>
            {turn.citations && turn.citations.length > 0 && (
              <p className={`mt-1 text-[11px] ${turn.role === 'user' ? 'text-white/80' : 'text-gray-500'}`}>
                {copy.citationsLabel}: {turn.citations.join(' · ')}
              </p>
            )}
          </article>
        ))}
        {busy && (
          <article className="mr-auto max-w-[40rem] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{copy.copilotLabel}</p>
            <p className="mt-1 flex items-center gap-2 text-gray-600">
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand-green/25 border-t-brand-green"
              />
              {phase === 'holding' ? copy.holding : phase === 'replanning' ? copy.replanning : copy.thinking}
            </p>
          </article>
        )}
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          value={draft}
          rows={2}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={copy.notePlaceholder}
          className="min-w-0 flex-1 resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
        >
          {busy ? copy.noteSending : copy.noteSend}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {copy.quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={busy}
            onClick={() => void send(prompt)}
            className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:border-brand-green/40 hover:text-brand-green-dark disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
