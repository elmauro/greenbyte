import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  applyDemoEvent,
  getInitialQueue,
  movedPoSet,
  type PlantEventType,
  type QueueRow,
} from '../../data/plantDemoMock';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

export function PlantLineMvp() {
  const { messages: m } = useLocale();
  const copy = m.plantMvp;
  const [queue, setQueue] = useState<QueueRow[]>(() => getInitialQueue());
  const [eventType, setEventType] = useState<PlantEventType | null>(null);
  const [moves, setMoves] = useState<ReturnType<typeof applyDemoEvent>['moves']>([]);
  const [accepted, setAccepted] = useState(false);

  const moved = useMemo(() => movedPoSet(moves), [moves]);
  const explanation = eventType ? copy.explanations[eventType] : null;

  function inject(type: PlantEventType) {
    const result = applyDemoEvent(queue, type);
    setQueue(result.queue);
    setMoves(result.moves);
    setEventType(type);
    setAccepted(false);
  }

  function reset() {
    setQueue(getInitialQueue());
    setEventType(null);
    setMoves([]);
    setAccepted(false);
  }

  return (
    <div className="pb-16">
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-green/10 via-white to-brand-blue/5 py-10">
        <div className="site-container max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-blue">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-gray-600">{copy.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
            <Link to={paths.demoPlantTour} className="text-brand-green hover:text-brand-green-dark">
              {copy.links.tour} →
            </Link>
            <Link to={paths.demoArchitecture} className="text-brand-blue hover:text-brand-blue/80">
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
            onClick={() => inject('rush')}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
          >
            {copy.actions.rush}
          </button>
          <button
            type="button"
            onClick={() => inject('qa_fail')}
            className="rounded-lg border border-brand-blue/30 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
          >
            {copy.actions.qaFail}
          </button>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {copy.actions.reset}
          </button>
        </div>

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
                        <td className="px-4 py-3 font-medium text-gray-900">{index + 1}</td>
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

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
          <p className="text-sm text-gray-600">
            {copy.footerStats.replace('{count}', String(queue.filter((r) => r.status !== 'COMPLETE').length))}
          </p>
          <button
            type="button"
            disabled={!eventType || accepted}
            onClick={() => setAccepted(true)}
            className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-brand-green-dark"
          >
            {accepted ? copy.actions.accepted : copy.actions.accept}
          </button>
        </div>
        {accepted && (
          <p className="text-center text-sm font-medium text-brand-green-dark">{copy.acceptedNote}</p>
        )}
        <p className="text-xs text-gray-500">{copy.mockNote}</p>
      </div>
    </div>
  );
}
