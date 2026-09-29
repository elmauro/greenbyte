import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlantFlowApiPanel } from '../../components/plant/flow/PlantFlowApiPanel';
import { PlantFlowStepPreview } from '../../components/plant/flow/PlantFlowStepPreview';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { PLANT_FLOW_STEPS } from '../../content/plantFlowSteps';
import { buildPlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../i18n';
import { paths } from '../../routes/paths';

export function PlantUc1FlowGallery() {
  const { locale, messages: m } = useLocale();
  const copy = m.plantFlowGallery;
  const snapshots = useMemo(() => buildPlantFlowSnapshots(locale), [locale]);
  const [searchParams, setSearchParams] = useSearchParams();
  const stepParam = searchParams.get('step');
  const initialIndex = stepParam
    ? Math.max(0, PLANT_FLOW_STEPS.findIndex((s) => s.id === stepParam))
    : 0;
  const [active, setActive] = useState(initialIndex >= 0 ? initialIndex : 0);

  useEffect(() => {
    if (stepParam) {
      const idx = PLANT_FLOW_STEPS.findIndex((s) => s.id === stepParam);
      if (idx >= 0) setActive(idx);
    }
  }, [stepParam]);

  const step = PLANT_FLOW_STEPS[active];
  const title = copy.slideTitles[step.titleKey];
  const trigger = copy.triggers[step.titleKey];
  const response = snapshots[step.responseKey];

  function goTo(index: number) {
    setActive(index);
    setSearchParams({ step: PLANT_FLOW_STEPS[index].id }, { replace: true });
  }

  return (
    <SiteLayout>
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-blue/5 via-white to-brand-green/5 py-8">
        <div className="site-container max-w-[100rem] px-4 lg:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{copy.eyebrow}</p>
          <h1 className="mt-2 text-2xl font-bold text-brand-blue sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 max-w-4xl text-sm text-gray-600 sm:text-base">{copy.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
            <Link
              to={paths.demoPlant}
              className="rounded-full bg-brand-green px-4 py-2 text-white hover:bg-brand-green-dark"
            >
              {copy.liveDemoCta} →
            </Link>
            <Link to={paths.demoPlantTour} className="inline-flex items-center text-brand-blue hover:underline">
              {copy.tourLink} →
            </Link>
          </div>
        </div>
      </section>

      <div className="site-container max-w-[100rem] px-4 py-6 lg:px-6">
        <nav
          className="flex items-center gap-2 overflow-x-auto border-b border-gray-200 pb-3 [-ms-overflow-style:none] [scrollbar-width:thin]"
          aria-label={copy.stepNavLabel}
        >
          {PLANT_FLOW_STEPS.map((s, i) => {
            const t = copy.slideTitles[s.titleKey];
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                title={t}
                className={`shrink-0 rounded-full border px-3 py-2 text-left text-xs transition sm:text-sm ${
                  isActive
                    ? 'border-brand-blue bg-brand-blue text-white shadow-sm'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-brand-green/40 hover:bg-brand-green/5'
                }`}
              >
                <span className="font-mono font-bold">{s.id}</span>
                <span className="ml-1.5 hidden font-medium sm:inline">{t}</span>
              </button>
            );
          })}
          <div className="ml-auto flex shrink-0 gap-1 pl-2">
            <button
              type="button"
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium disabled:opacity-40"
              aria-label={copy.prev}
            >
              ←
            </button>
            <button
              type="button"
              disabled={active >= PLANT_FLOW_STEPS.length - 1}
              onClick={() => goTo(active + 1)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-medium disabled:opacity-40"
              aria-label={copy.next}
            >
              →
            </button>
          </div>
        </nav>

        <div className="mt-4 min-w-0">
          <h2 className="text-lg font-semibold text-brand-blue sm:text-xl">{title}</h2>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">{copy.previewHeading}</p>

          <div className="mt-4 flex min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
            <div className="min-w-0 flex-[1.55] overflow-x-auto lg:overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
              <PlantFlowStepPreview step={step} snapshots={snapshots} />
            </div>
            <div className="min-w-0 flex-1 lg:max-w-[22rem] xl:max-w-md shrink-0">
              <PlantFlowApiPanel
                trigger={trigger}
                backendOwners={copy.backendOwners[step.backendOwnerKey]}
                backendOwnersLabel={copy.backendOwnersLabel}
                method={step.method}
                path={step.path}
                request={step.request}
                response={response}
                mapping={step.mapping}
                compact
              />
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
