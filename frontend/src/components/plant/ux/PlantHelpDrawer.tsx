import type { Locale } from '../../../i18n/LocaleContext';

type PlantHelpDrawerProps = {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  copy: {
    title: string;
    close: string;
    glossaryTitle: string;
    journeysTitle: string;
    presenterTitle: string;
    glossary: { term: string; def: string }[];
    journeys: { title: string; steps: string[] }[];
    talkTrack: string[];
  };
};

export function PlantHelpDrawer({ open, onClose, locale, copy }: PlantHelpDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="plant-help-title">
      <button type="button" className="absolute inset-0 bg-black/30" aria-label={copy.close} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 id="plant-help-title" className="text-lg font-semibold text-gray-900">
            {copy.title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            {copy.close}
          </button>
        </div>
        <div className="space-y-6 p-4 text-sm" lang={locale}>
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
          <section>
            <h3 className="font-semibold text-brand-green-dark">{copy.presenterTitle}</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-gray-700">
              {copy.talkTrack.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      </aside>
    </div>
  );
}
