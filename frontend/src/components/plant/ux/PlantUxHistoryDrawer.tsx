import {
  formatPlantHistoryWhen,
  type PlantUxHistoryEntry,
} from '../../../demo/plant/plantUxApprovalHistory';
import { plantLineById } from '../../../demo/plant/plantLines';
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
    metaLine: string;
    todayAt: string;
    yesterdayAt: string;
    onDate: string;
  };
};

function lineLabel(lineId: string): string {
  const line = plantLineById(lineId);
  return line.sheet.replace(/ Schedule$/i, '');
}

export function PlantUxHistoryDrawer({
  open,
  onClose,
  locale,
  entries,
  copy,
}: PlantUxHistoryDrawerProps) {
  if (!open) return null;

  const whenCopy = {
    todayAt: copy.todayAt,
    yesterdayAt: copy.yesterdayAt,
    onDate: copy.onDate,
  };

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
          entries.map((e) => {
            const title =
              e.kind === 'priority'
                ? copy.priority.replace('{po}', e.po)
                : copy.quality.replace('{po}', e.po);
            const when = formatPlantHistoryWhen(e.at, locale, whenCopy);
            const meta = copy.metaLine
              .replace('{line}', lineLabel(e.lineId))
              .replace('{when}', when);
            return (
              <li
                key={e.id}
                className="mb-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2"
              >
                <p className="font-medium text-gray-900">{title}</p>
                <p className="mt-1 text-xs text-gray-500">{meta}</p>
              </li>
            );
          })
        )}
      </ul>
    </PlantSideDrawer>
  );
}
