import { useState } from 'react';
import {
  appendCopilotTurn,
  askCopilot,
  readCopilotThreads,
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
    askError: string;
    rushError: string;
    citationsLabel: string;
    noteEmpty: string;
    notePlaceholder: string;
    noteSend: string;
    quickPrompts: string[];
  };
};

/** Notes on one queue row. The same thread the copilot tab reads. */
export function PlantQueueNote({ po, lineId, locale, onQueueRefresh, copy }: PlantQueueNoteProps) {
  const [threads, setThreads] = useState(readCopilotThreads);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const turns = threads[po] ?? [];

  function remember(turn: CopilotTurn) {
    setThreads((prev) => {
      const next = appendCopilotTurn(prev, po, turn);
      writeCopilotThreads(next);
      return next;
    });
  }

  async function send(text: string) {
    const asked = text.trim();
    if (!asked || busy) return;
    const history = (threads[po] ?? []).slice(-4).map((turn) => ({ role: turn.role, text: turn.text }));
    remember({ role: 'user', text: asked });
    setDraft('');
    setBusy(true);
    try {
      remember(await askCopilot({
        po,
        question: asked,
        locale,
        lineId,
        history,
        onQueueRefresh,
        rushError: copy.rushError,
      }));
    } catch {
      remember({ role: 'copilot', text: copy.askError });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-gray-50 px-4 py-3">
      <div className="space-y-2">
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
        {busy && <p className="text-xs text-gray-500">{copy.thinking}</p>}
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
          {copy.noteSend}
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
