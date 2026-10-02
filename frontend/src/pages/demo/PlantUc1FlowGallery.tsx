import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PlantFlowApiPanel } from '../../components/plant/flow/PlantFlowApiPanel';
import { PlantFlowStepPreview } from '../../components/plant/flow/PlantFlowStepPreview';
import { DemoPageBody, DemoPageIntro } from '../../components/layout/DemoPageIntro';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { PLANT_FLOW_STEPS } from '../../content/plantFlowSteps';
import { buildPlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../i18n';

export function PlantUc1FlowGallery({ embedded = false }: { embedded?: boolean }) {
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
  const request = step.requestKey ? snapshots[step.requestKey] : step.request;
  const isFirst = active === 0;
  const isLast = active >= PLANT_FLOW_STEPS.length - 1;

  function goTo(index: number) {
    setActive(index);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      params.set('step', PLANT_FLOW_STEPS[index].id);
      return params;
    }, { replace: true });
  }

  const body = (
      <DemoPageBody contained={!embedded} className={embedded ? 'py-0' : ''}>
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
        </nav>

        <div className="sticky top-0 z-10 -mx-1 mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-1 py-3 backdrop-blur">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => goTo(active - 1)}
            className="rounded-full border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← {copy.prev}
          </button>
          <p className="text-center text-xs font-medium text-gray-500 sm:text-sm">
            <span className="font-mono text-brand-blue">{step.id}</span>
            <span className="mx-2 text-gray-300">·</span>
            {active + 1} / {PLANT_FLOW_STEPS.length}
          </p>
          <button
            type="button"
            disabled={isLast}
            onClick={() => goTo(active + 1)}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.next} →
          </button>
        </div>

        <div className="mt-4 min-w-0">
          <h2 className="text-xl font-semibold text-brand-blue">{title}</h2>

          <div className="mt-4 space-y-4">
            <PlantFlowApiPanel
              trigger={trigger}
              backendOwners={copy.backendOwners[step.backendOwnerKey]}
              backendOwnersLabel={copy.backendOwnersLabel}
              method={step.method}
              path={step.path}
              request={request}
              response={response}
              mapping={step.mapping}
              requestHeading={copy.requestHeading}
              responseHeading={copy.responseHeading}
              noBody={copy.noBody}
            />
            <div>
              <p className="text-sm font-medium text-gray-700">{copy.previewHeading}</p>
              <div className="mt-3 min-w-0 overflow-x-auto">
                <PlantFlowStepPreview step={step} snapshots={snapshots} />
              </div>
            </div>
          </div>
        </div>
      </DemoPageBody>
  );

  if (embedded) return body;

  return (
    <SiteLayout>
      <div className="pb-16">
        <DemoPageIntro eyebrow={copy.eyebrow} title={copy.title} subtitle={copy.subtitle} />
        {body}
      </div>
    </SiteLayout>
  );
}
