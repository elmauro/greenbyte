import { useEffect, useMemo, useState } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { plantDemoApi } from '../../services/plantDemoApi';
import { PlantSelect } from './PlantSelect';

type PlantBatchExplainChatProps = {
  queue: QueueRow[];
  /** Inside plant shell AI Copilot nav — parent supplies page title. */
  embedded?: boolean;
  /** Order chosen from the schedule. Selects that batch when it is on this line. */
  focusPo?: string;
  /** Keeps the timeline selection in sync when the order is changed from this panel. */
  onPoChange?: (po: string) => void;
};

export function PlantBatchExplainChat({
  queue,
  embedded = false,
  focusPo,
  onPoChange,
}: PlantBatchExplainChatProps) {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp.salesChat;
  const shell = m.plantMvp.scheduleShell;
  const selectable = useMemo(() => queue.filter((r) => r.status !== 'COMPLETE'), [queue]);
  const [po, setPo] = useState(() => {
    if (focusPo && selectable.some((row) => row.po === focusPo)) return focusPo;
    return selectable[0]?.po ?? '';
  });
  const selected = selectable.find((row) => row.po === po) ?? null;
  const position = selected ? queue.findIndex((row) => row.po === selected.po) + 1 : 0;
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (po && selectable.some((row) => row.po === po)) return;
    setPo(selectable[0]?.po ?? '');
    setAnswer(null);
    setCitations([]);
  }, [selectable, po]);

  useEffect(() => {
    if (!focusPo || focusPo === po) return;
    if (!selectable.some((row) => row.po === focusPo)) return;
    setPo(focusPo);
    setAnswer(null);
    setCitations([]);
  }, [focusPo, selectable, po]);

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

  function choosePo(next: string) {
    setPo(next);
    setAnswer(null);
    setCitations([]);
    onPoChange?.(next);
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      {!embedded && (
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-gray-900">{copy.title}</h3>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div className="min-w-[16rem] flex-1 text-sm">
          <label htmlFor="explain-po" className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {copy.poLabel}
          </label>
          <PlantSelect
            id="explain-po"
            className="mt-1.5 w-full max-w-sm"
            value={po}
            onChange={choosePo}
            options={selectable.map((row) => ({
              value: row.po,
              label: `${row.po} · ${row.species}`,
            }))}
          />
        </div>
        {selected && (
          <p className="pb-2 text-sm text-gray-600">
            {shell.queuePosition.replace('{n}', String(position))}
            {' · '}
            {selected.kg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} kg
            {' · '}
            {selected.finish}
            {selected.status === 'HOLD' ? ` · ${shell.holdShort}` : ''}
          </p>
        )}
      </div>

      <div className="px-5 py-8">
        {answer ? (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm leading-relaxed text-gray-800">
            <p>{answer.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
            {citations.length > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                {copy.citationsLabel}: {citations.join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-lg text-center">
            <p className="text-lg text-brand-green" aria-hidden>
              ✦
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{copy.subtitle}</p>
          </div>
        )}
      </div>

      <form
        className="border-t border-gray-100 bg-gray-50/70 px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <div className="flex flex-wrap gap-2">
          {copy.quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={busy || !po}
              onClick={() => void ask(prompt)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-brand-green/40 hover:text-brand-green-dark disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={copy.inputPlaceholder}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !po || !question.trim()}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
          >
            {copy.askButton}
          </button>
        </div>
      </form>
    </section>
  );
}
