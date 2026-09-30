import { useMemo, useState } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { plantDemoApi } from '../../services/plantDemoApi';

type PlantBatchExplainChatProps = {
  queue: QueueRow[];
  /** Inside plant shell AI Copilot nav — parent supplies page title. */
  embedded?: boolean;
};

export function PlantBatchExplainChat({ queue, embedded = false }: PlantBatchExplainChatProps) {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp.salesChat;
  const selectable = useMemo(() => queue.filter((r) => r.status !== 'COMPLETE'), [queue]);
  const [po, setPo] = useState(() => selectable[0]?.po ?? '');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask(preset?: string) {
    const q = preset ?? question.trim();
    if (!po || !q) return;
    setBusy(true);
    try {
      const res = await plantDemoApi.postBatchExplain(po, q, locale);
      setAnswer(res.answer);
      setCitations(res.citations);
      if (!preset) setQuestion('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-blue">{copy.eyebrow}</p>
      {!embedded && <h3 className="mt-1 text-lg font-semibold text-gray-900">{copy.title}</h3>}
      <p className={`text-sm text-gray-600 ${embedded ? 'mt-2' : 'mt-2'}`}>{copy.subtitle}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex flex-col text-sm">
          <span className="font-medium text-gray-700">{copy.poLabel}</span>
          <select
            value={po}
            onChange={(e) => {
              setPo(e.target.value);
              setAnswer(null);
            }}
            className="mt-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {selectable.map((r) => (
              <option key={r.po} value={r.po}>
                {r.po} · {r.species}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {copy.quickPrompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={busy || !po}
            onClick={() => void ask(prompt)}
            className="rounded-full border border-brand-blue/30 bg-white px-3 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={copy.inputPlaceholder}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !po || !question.trim()}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
        >
          {copy.askButton}
        </button>
      </form>

      {answer && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
          <p>{answer.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
          {citations.length > 0 && (
            <p className="mt-3 text-xs text-gray-500">
              {copy.citationsLabel}: {citations.join(' · ')}
            </p>
          )}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">{copy.agentNote}</p>
    </section>
  );
}
