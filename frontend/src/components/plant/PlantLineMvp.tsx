import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PlantEventType, PlantExplanation, QueueRow } from '../../demo/plant/plantDemoTypes';
import { movedPoSet } from '../../demo/plant/plantDemoServer';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';
import { plantDemoApi } from '../../services/plantDemoApi';
import { PlantMiniTimeline } from './PlantMiniTimeline';

export function PlantLineMvp() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantMvp;
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
  const [moves, setMoves] = useState<{ po: string; fromPosition: number; toPosition: number }[]>([]);
  const [explanation, setExplanation] = useState<PlantExplanation | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const moved = useMemo(() => movedPoSet(moves), [moves]);
  const wowSrc =
    locale === 'es' ? '/demo/es/uc1-plant-capacity-wow.png' : '/demo/uc1-plant-capacity-wow.png';

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await plantDemoApi.getQueue();
      setQueue(res.queue);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  async function inject(type: PlantEventType) {
    setBusy(true);
    try {
      const res = await plantDemoApi.postEvent(type, locale);
      setQueue(res.queue);
      setMoves(res.diff.moves);
      setEventType(type);
      setExplanation(res.explanation);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      const res = await plantDemoApi.resetDemo();
      setQueue(res.queue);
      setEventType(null);
      setMoves([]);
      setExplanation(null);
      setAccepted(false);
    } finally {
      setBusy(false);
    }
  }

  async function acceptPlan() {
    setBusy(true);
    try {
      await plantDemoApi.postAccept();
      setAccepted(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-green/10 via-white to-brand-blue/5 py-10">
        <div className="site-container max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-blue">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-gray-600">{copy.subtitle}</p>
          <p className="mt-2 text-sm font-medium text-brand-blue/80">{copy.demoTargetBadge}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link
              to={paths.demoPlantTour}
              className="rounded-full bg-brand-green px-4 py-2 text-white hover:bg-brand-green-dark"
            >
              {copy.links.tourCta} →
            </Link>
            <Link to={paths.demoArchitecture} className="inline-flex items-center text-brand-blue hover:text-brand-blue/80">
              {copy.links.architecture} →
            </Link>
          </div>
        </div>
      </section>

      <div className="site-container mt-8 max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-brand-blue">{copy.lineTitle}</h2>
            <p className="text-sm text-gray-500">{copy.lineSubtitle}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              eventType ? 'bg-amber-100 text-amber-900' : 'bg-brand-green/10 text-brand-green-dark'
            }`}
          >
            {eventType ? copy.status.eventActive : copy.status.calm}
          </span>
        </div>

        {eventType && explanation && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            {explanation.alertBanner}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void inject('rush')}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
          >
            {copy.actions.rush}
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void inject('qa_fail')}
            className="rounded-lg border border-brand-blue/30 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
          >
            {copy.actions.qaFail}
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void reset()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            {copy.actions.reset}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">{copy.loading}</p>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h3 className="font-semibold text-gray-900">{copy.queueTitle}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">{copy.table.position}</th>
                        <th className="px-4 py-3">{copy.table.po}</th>
                        <th className="px-4 py-3">{copy.table.species}</th>
                        <th className="px-4 py-3">{copy.table.kg}</th>
                        <th className="px-4 py-3">{copy.table.finish}</th>
                        <th className="px-4 py-3">{copy.table.status}</th>
                        <th className="px-4 py-3">{copy.table.reason}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {queue.map((row, index) => {
                        const isMoved = moved.has(row.po);
                        return (
                          <tr
                            key={row.po}
                            className={isMoved ? 'bg-brand-green/5 ring-1 ring-inset ring-brand-green/30' : undefined}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {index + 1}
                              {row.previousPosition != null && row.previousPosition !== index + 1 && (
                                <span className="ml-1 text-xs text-gray-400">← {row.previousPosition}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{row.po}</td>
                            <td className="px-4 py-3">{row.species}</td>
                            <td className="px-4 py-3">{row.kg.toLocaleString()}</td>
                            <td className="px-4 py-3">{row.finish}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                  row.status === 'HOLD'
                                    ? 'bg-red-100 text-red-800'
                                    : row.status === 'COMPLETE'
                                      ? 'bg-gray-100 text-gray-600'
                                      : row.atRisk
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-brand-green/10 text-brand-green-dark'
                                }`}
                              >
                                {row.status === 'HOLD'
                                  ? copy.statusLabels.hold
                                  : row.status === 'COMPLETE'
                                    ? copy.statusLabels.complete
                                    : row.atRisk
                                      ? copy.statusLabels.atRisk
                                      : copy.statusLabels.planned}
                              </span>
                            </td>
                            <td className="max-w-[12rem] px-4 py-3 text-xs text-gray-600">{row.reasonShort ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="font-semibold text-brand-blue">{copy.copilotTitle}</h3>
                {!explanation ? (
                  <p className="mt-3 text-sm text-gray-600">{copy.copilotIdle}</p>
                ) : (
                  <div className="mt-3 space-y-3 text-sm text-gray-700">
                    <p className="font-medium text-gray-900">{explanation.summary}</p>
                    <ul className="list-disc space-y-2 pl-5">
                      {explanation.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    {explanation.impact && (
                      <p className="rounded-lg bg-brand-green/5 px-3 py-2 text-brand-green-dark">{explanation.impact}</p>
                    )}
                  </div>
                )}
              </aside>
            </div>

            {eventType && (
              <>
                <PlantMiniTimeline
                  title={copy.timelineTitle}
                  subtitle={copy.timelineSubtitle}
                  rows={queue}
                  rushPo={eventType === 'rush' ? '1002307551' : undefined}
                />
                <section>
                  <h3 className="text-lg font-semibold text-brand-blue">{copy.wowVisualTitle}</h3>
                  <p className="mt-1 text-sm text-gray-500">{copy.wowVisualSubtitle}</p>
                  <img
                    src={wowSrc}
                    alt={copy.wowVisualAlt}
                    className="mt-4 w-full rounded-xl border border-gray-200 shadow-sm"
                  />
                </section>
              </>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <p className="text-sm text-gray-600">
            {copy.footerStats.replace('{count}', String(queue.filter((r) => r.status !== 'COMPLETE').length))}
          </p>
          <button
            type="button"
            disabled={!eventType || accepted || busy}
            onClick={() => void acceptPlan()}
            className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-brand-green-dark"
          >
            {accepted ? copy.actions.accepted : copy.actions.accept}
          </button>
        </div>
        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <p className="text-xs text-gray-500">
          {plantDemoApi.useRemoteBff ? copy.apiNoteBff : copy.apiNoteLocal}
        </p>
      </div>
    </div>
  );
}
