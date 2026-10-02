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
