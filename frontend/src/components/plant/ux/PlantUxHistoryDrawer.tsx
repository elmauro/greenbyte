import type { PlantUxHistoryEntry } from '../../../demo/plant/plantUxApprovalHistory';
import type { Locale } from '../../../i18n/LocaleContext';
import { PlantSideDrawer } from './PlantSideDrawer';

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
    <PlantSideDrawer
      open
      onClose={onClose}
      closeLabel={copy.close}
      titleId="plant-history-title"
      title={copy.title}
      subtitle={copy.subtitle}
      locale={locale}
    >
      <ul className="p-4 text-sm">
        {entries.length === 0 ? (
          <li className="text-gray-600">{copy.empty}</li>
        ) : (
          entries.map((e) => (
            <li key={e.at} className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
              <p className="font-medium text-gray-900">{e.kind === 'priority' ? copy.priority : copy.quality}</p>
              <p className="mt-1 text-xs text-gray-500">{copy.byLine.replace('{t}', formatTime(e.at, locale))}</p>
            </li>
          ))
        )}
      </ul>
    </PlantSideDrawer>
  );
}
