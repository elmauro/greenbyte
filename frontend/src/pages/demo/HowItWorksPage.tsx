import { useSearchParams } from 'react-router-dom';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { useLocale } from '../../i18n';
import { HackathonArchitecturePage } from './HackathonArchitecturePage';
import { PlantUc1FlowGallery } from './PlantUc1FlowGallery';

type HowSection = 'architecture' | 'api';

function sectionFrom(params: URLSearchParams): HowSection {
  return params.get('section') === 'api' ? 'api' : 'architecture';
}

export function HowItWorksPage() {
  const { messages: m } = useLocale();
  const copy = m.howItWorks;
  const [searchParams, setSearchParams] = useSearchParams();
  const section = sectionFrom(searchParams);

  function selectSection(next: HowSection) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'architecture') {
          params.delete('section');
          params.delete('step');
        } else {
          params.set('section', 'api');
        }
        return params;
      },
      { replace: true },
    );
  }

  const items: { id: HowSection; label: string }[] = [
    { id: 'architecture', label: copy.architecture },
    { id: 'api', label: copy.api },
  ];

  return (
    <SiteLayout>
      <div className="site-container-demo flex flex-col gap-6 py-8 md:flex-row md:items-start">
        <aside className="md:sticky md:top-24 md:w-52 md:shrink-0">
          <nav aria-label={copy.navLabel} className="flex gap-2 md:flex-col">
            {items.map((item) => {
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectSection(item.id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    active ? 'bg-brand-green text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-brand-blue">
            {section === 'api' ? copy.api : copy.architecture}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray-600">
            {section === 'api' ? m.plantFlowGallery.subtitle : m.demoArchitecture.subtitle}
          </p>
          <div className="mt-8">
            {section === 'api' ? <PlantUc1FlowGallery embedded /> : <HackathonArchitecturePage embedded />}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
