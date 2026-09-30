import type { PlantUxHistoryEntry } from '../../../demo/plant/plantUxApprovalHistory';
import type { Locale } from '../../../i18n/LocaleContext';

type PlantUxHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  entries: PlantUxHistoryEntry[];
  copy: {
    title: string;
    subtitle: string;
    empty: string;
    close: string;
    priority: string;
    quality: string;
    byLine: string;
  };
};

function formatTime(iso: string, locale: Locale) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PlantUxHistoryDrawer({
  open,
  onClose,
  locale,
  entries,
  copy,
}: PlantUxHistoryDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label={copy.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
          <p className="mt-1 text-xs text-gray-500">{copy.subtitle}</p>
        </div>
        <ul className="flex-1 p-4 text-sm">
          {entries.length === 0 ? (
            <li className="text-gray-600">{copy.empty}</li>
          ) : (
            entries.map((e) => (
              <li key={e.at} className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                <p className="font-medium text-gray-900">
                  {e.kind === 'priority' ? copy.priority : copy.quality}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {copy.byLine.replace('{t}', formatTime(e.at, locale))}
                </p>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-gray-100 p-4">
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
