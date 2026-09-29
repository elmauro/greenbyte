export type QueueColumnHighlight = 'finish' | 'status' | 'reason';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { speciesDisplay } from '../../demo/plant/plantSpeciesDisplay';
import type { Locale } from '../../i18n/LocaleContext';
import { useLocale } from '../../i18n';

type PlantBaselineDashboardProps = {
  queue: QueueRow[];
  highlightColumns?: QueueColumnHighlight[];
  /** Flow gallery: drop sidebar to save horizontal space */
  compact?: boolean;
};

function formatFinish(finish: string, locale: Locale, pattern: string) {
  const [datePart, timePart] = finish.split(' ');
  const d = new Date(`${datePart}T${timePart ?? '12:00'}:00`);
  if (Number.isNaN(d.getTime())) return finish;
  const dateStr = d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: locale === 'es' ? 'long' : 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return pattern.replace('{date}', dateStr).replace('{time}', timeStr);
}

function formatPo(po: string) {
  return `PO-${po.slice(-6)}`;
}

export function PlantBaselineDashboard({
  queue,
  highlightColumns = [],
  compact = false,
}: PlantBaselineDashboardProps) {
  const { locale, messages: m } = useLocale();
  const b = m.plantMvp.baselineDashboard;
  const copy = m.plantMvp;
  const hi = new Set(highlightColumns);
  const active = queue.filter((r) => r.status !== 'COMPLETE');
  const totalKg = active.reduce((s, r) => s + r.kg, 0);
  const nextRow = active[0];
  const utilization = Math.min(95, 58 + active.length * 2);

  const navItems = [
    b.nav.panel,
    b.nav.scheduling,
    b.nav.queue,
    b.nav.lineStatus,
    b.nav.inventory,
    b.nav.reports,
    b.nav.copilot,
    b.nav.settings,
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f8faf8] shadow-lg">
      <div className="flex min-h-[520px] flex-col md:flex-row">
        <aside
          className={`w-52 shrink-0 border-r border-gray-200 bg-white px-3 py-4 ${compact ? 'hidden' : 'hidden md:block'}`}
        >
          <div className="mb-6 flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green text-xs font-bold text-white">
              G
            </span>
            <div className="text-[10px] leading-tight">
              <p className="font-bold text-brand-green">GreenByte</p>
              <p className="text-gray-500">{b.tagline}</p>
            </div>
          </div>
          <nav className="space-y-0.5 text-sm">
            {navItems.map((label, i) => (
              <div
                key={label}
                className={`rounded-lg px-3 py-2 ${
                  i === 0 ? 'bg-brand-green/10 font-semibold text-brand-green-dark' : 'text-gray-600'
                }`}
              >
                {label}
              </div>
            ))}
          </nav>
          <p className="mt-8 px-2 text-[10px] text-gray-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-green" />
            {b.systemsOk}
            <br />
            {b.lastUpdated}
          </p>
        </aside>

        <div className="min-w-0 flex-1 bg-white p-4 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{b.pageTitle}</h2>
              <p className="mt-1 text-sm font-medium text-brand-green">{b.moodLine}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                <span className="text-brand-green">🛡</span>
                {b.systemStable}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-gray-600">
                📅 {b.headerDate}
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                👤
              </span>
            </div>
          </header>

          <section className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900">
                  {b.queueTitle}
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
                    {b.orderCount.replace('{n}', String(queue.length))}
                  </span>
                </h3>
                <p className="mt-1 text-xs text-gray-500">{b.queueSubtitle}</p>
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {b.sortFilter}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50/90 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">{copy.table.position}</th>
                    <th className="px-4 py-3">{b.colPo}</th>
                    <th className="px-4 py-3">{b.colSpecies}</th>
                    <th className="px-4 py-3">{copy.table.kg}</th>
                    <th
                      className={`px-4 py-3 ${hi.has('finish') ? 'bg-brand-green/10 ring-1 ring-inset ring-brand-green/30' : ''}`}
                    >
                      {copy.table.finish}
                    </th>
                    <th
                      className={`px-4 py-3 ${hi.has('status') ? 'bg-brand-green/10 ring-1 ring-inset ring-brand-green/30' : ''}`}
                    >
                      {copy.table.status}
                    </th>
                    <th className="w-10 px-2 py-3" aria-label={b.actionsAria} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queue.map((row, index) => {
                    const sp = speciesDisplay(row.species, locale);
                    const isComplete = row.status === 'COMPLETE';
                    return (
                      <tr key={row.po} className="hover:bg-gray-50/80">
                        <td className="px-4 py-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                            {index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{formatPo(row.po)}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{sp.common}</p>
                          <p className="text-xs italic text-gray-500">{sp.scientific}</p>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-800">{row.kg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}</td>
                        <td
                          className={`px-4 py-3 text-xs leading-snug text-gray-700 ${hi.has('finish') ? 'bg-brand-green/5' : ''}`}
                        >
                          {formatFinish(row.finish, locale, b.finishFormat)}
                        </td>
                        <td className={`px-4 py-3 ${hi.has('status') ? 'bg-brand-green/5' : ''}`}>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isComplete
                                ? 'bg-brand-green/10 text-brand-green-dark'
                                : row.atRisk
                                  ? 'bg-amber-50 text-amber-900'
                                  : 'bg-brand-green/10 text-brand-green-dark'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isComplete ? 'bg-brand-green/60' : row.atRisk ? 'bg-amber-500' : 'bg-brand-green'
                              }`}
                            />
                            {isComplete
                              ? copy.statusLabels.complete
                              : row.atRisk
                                ? copy.statusLabels.atRisk
                                : copy.statusLabels.planned}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-400">⋯</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-brand-green/5 to-white p-4 sm:col-span-2 lg:col-span-1">
              <p className="text-xs font-semibold uppercase text-brand-green">{b.summaryTitle}</p>
              <p className="mt-2 text-lg font-bold text-brand-green-dark">{b.summaryHeadline}</p>
              <p className="mt-2 text-xs leading-relaxed text-gray-600">{b.summaryBullets}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{b.metricLoad}</p>
              <p className="text-xl font-bold text-gray-900">
                {totalKg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} kg
              </p>
              <div className="mt-2 h-8 rounded bg-gradient-to-r from-brand-green/20 via-brand-green/40 to-brand-green/10" />
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{b.metricNextFinish}</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {nextRow
                  ? formatFinish(nextRow.finish, locale, b.finishFormat)
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500">{b.metricUtilization}</p>
              <p className="text-xl font-bold text-gray-900">{utilization}%</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-brand-green" style={{ width: `${utilization}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <span className="text-brand-green">✦</span>
                  {b.copilotReady}
                </p>
                <p className="mt-1 text-xs text-gray-500">{copy.copilotIdle}</p>
              </div>
              <span className="text-gray-300">ⓘ</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
