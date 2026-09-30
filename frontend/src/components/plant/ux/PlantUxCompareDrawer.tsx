import type { QueueRow } from '../../../demo/plant/plantDemoTypes';
import type { Locale } from '../../../i18n/LocaleContext';

type PlantUxCompareDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  queue: QueueRow[];
  selectedPo: string[];
  formatFinish: (finish: string) => string;
  copy: {
    title: string;
    subtitle: string;
    close: string;
    totalWeight: string;
    crops: string;
    firstFinish: string;
    lastFinish: string;
    holds: string;
    colPosition: string;
    colOrder: string;
    colWeight: string;
    colFinish: string;
    colStatus: string;
    paused: string;
    statusPlanned: string;
    statusAtRisk: string;
    statusComplete: string;
    statusHold: string;
  };
};

function fmtKg(n: number, locale: Locale) {
  return `${n.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} kg`;
}

export function PlantUxCompareDrawer({
  open,
  onClose,
  locale,
  queue,
  selectedPo,
  formatFinish,
  copy,
}: PlantUxCompareDrawerProps) {
  if (!open) return null;

  const picked = queue
    .map((r, i) => ({ r, pos: i + 1 }))
    .filter(({ r }) => selectedPo.includes(r.po));
  const total = picked.reduce((a, { r }) => a + r.kg, 0);
  const timed = picked.filter(({ r }) => r.status !== 'COMPLETE' && r.finish);
  const holds = picked.filter(({ r }) => r.status === 'HOLD').length;
  const crops = Array.from(new Set(picked.map(({ r }) => r.species))).join(' · ');

  function statusLabel(row: QueueRow) {
    if (row.status === 'HOLD') return copy.statusHold;
    if (row.status === 'COMPLETE') return copy.statusComplete;
    if (row.atRisk) return copy.statusAtRisk;
    return copy.statusPlanned;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label={copy.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-xs text-gray-500">{copy.subtitle}</p>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{copy.totalWeight}</p>
              <p className="mt-1 font-semibold text-gray-900">{fmtKg(total, locale)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{copy.crops}</p>
              <p className="mt-1 font-semibold text-gray-900">{crops || '—'}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{copy.firstFinish}</p>
              <p className="mt-1 font-semibold text-gray-900">{timed[0]?.r.po ?? '—'}</p>
              {timed[0] && (
                <p className="text-xs text-gray-500">{formatFinish(timed[0].r.finish)}</p>
              )}
            </div>
            <div className="rounded-lg border border-gray-100 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{copy.lastFinish}</p>
              <p className="mt-1 font-semibold text-gray-900">{timed.at(-1)?.r.po ?? '—'}</p>
              {timed.at(-1) && (
                <p className="text-xs text-gray-500">{formatFinish(timed.at(-1)!.r.finish)}</p>
              )}
            </div>
          </div>
          {holds > 0 && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              {copy.holds.replace('{n}', String(holds))}
            </p>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50/90 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">{copy.colPosition}</th>
                  <th className="px-3 py-2">{copy.colOrder}</th>
                  <th className="px-3 py-2">{copy.colWeight}</th>
                  <th className="px-3 py-2">{copy.colFinish}</th>
                  <th className="px-3 py-2">{copy.colStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {picked.map(({ r, pos }) => (
                  <tr key={r.po}>
                    <td className="px-3 py-2 font-semibold">{pos}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.po}
                      <span className="block font-sans text-gray-500">{r.species}</span>
                    </td>
                    <td className="px-3 py-2">{fmtKg(r.kg, locale)}</td>
                    <td className="px-3 py-2 text-xs">
                      {r.status === 'HOLD' || !r.finish ? copy.paused : formatFinish(r.finish)}
                    </td>
                    <td className="px-3 py-2 text-xs font-medium">{statusLabel(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-auto border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {copy.close}
          </button>
        </div>
      </aside>
    </div>
  );
}
