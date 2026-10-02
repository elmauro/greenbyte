import type { Locale } from '../../../i18n/LocaleContext';
import { PlantSideDrawer } from './PlantSideDrawer';

export const PLANT_HELP_OPEN_EVENT = 'greenbyte-plant-help-open';

export function openPlantHelp() {
  window.dispatchEvent(new Event(PLANT_HELP_OPEN_EVENT));
}

type PlantHelpDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  copy: {
    title: string;
    close: string;
    glossaryTitle: string;
    journeysTitle: string;
    timelineTitle: string;
    glossary: { term: string; def: string }[];
    journeys: { title: string; steps: string[] }[];
    timelineLegend: { tone: 'up' | 'rush' | 'hold' | 'quiet'; label: string }[];
    timelineRules: string[];
  };
};

const TIMELINE_SWATCH: Record<PlantHelpDrawerProps['copy']['timelineLegend'][number]['tone'], string> = {
  up: 'bg-brand-green',
  rush: 'bg-orange-500',
  hold: 'bg-red-600',
  quiet: 'bg-indigo-200 ring-1 ring-indigo-300',
};

export function PlantHelpDrawer({ open, onClose, locale, copy }: PlantHelpDrawerProps) {
  if (!open) return null;

  return (
    <PlantSideDrawer
      open
      onClose={onClose}
      closeLabel={copy.close}
      titleId="plant-help-title"
      title={copy.title}
      locale={locale}
    >
      <div className="space-y-6 p-4 text-sm">
          <section>
            <h3 className="font-semibold text-brand-green-dark">{copy.timelineTitle}</h3>
            <ul className="mt-2 space-y-2">
              {copy.timelineLegend.map((item) => (
                <li key={item.tone} className="flex items-center gap-2 text-gray-700">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${TIMELINE_SWATCH[item.tone]}`} />
                  {item.label}
                </li>
              ))}
            </ul>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-600">
              {copy.timelineRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="font-semibold text-brand-green-dark">{copy.glossaryTitle}</h3>
            <dl className="mt-2 space-y-2">
              {copy.glossary.map((g) => (
                <div key={g.term}>
                  <dt className="font-medium text-gray-900">{g.term}</dt>
                  <dd className="text-gray-600">{g.def}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section>
            <h3 className="font-semibold text-brand-green-dark">{copy.journeysTitle}</h3>
            <ul className="mt-2 space-y-4">
              {copy.journeys.map((j) => (
                <li key={j.title}>
                  <p className="font-medium text-gray-900">{j.title}</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-gray-600">
                    {j.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </section>
      </div>
    </PlantSideDrawer>
  );
}
