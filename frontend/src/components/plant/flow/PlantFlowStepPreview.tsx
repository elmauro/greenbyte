import type { PlantFlowPreviewKind, PlantFlowStepConfig } from '../../../content/plantFlowSteps';
import type { PlantFlowSnapshots } from '../../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../../i18n';
import type { PlantNavSection } from '../PlantBaselineDashboard';
import { PlantBaselineDashboard } from '../PlantBaselineDashboard';

type PlantFlowStepPreviewProps = {
  step: PlantFlowStepConfig;
  snapshots: PlantFlowSnapshots;
};

function defaultSectionForPreview(preview: PlantFlowPreviewKind): PlantNavSection {
  switch (preview) {
    case 'load':
      return 'dashboard';
    case 'at_risk':
    case 'rush':
    case 'qa':
      return 'queue';
    case 'copilot':
    case 'timeline':
    case 'accept':
      return 'scheduling';
    case 'explain':
      return 'dashboard';
    default:
      return 'dashboard';
  }
}

function schedulingLayoutForPreview(
  preview: PlantFlowPreviewKind,
): 'full' | 'timeline-only' | undefined {
  if (preview === 'copilot') return 'full';
  if (preview === 'timeline' || preview === 'accept') return 'timeline-only';
  return undefined;
}

export function PlantFlowStepPreview({ step, snapshots }: PlantFlowStepPreviewProps) {
  const { messages: m } = useLocale();
  const sales = m.plantMvp.salesChat;
  const rush = snapshots.rush;
  const qa = snapshots.qa;

  if (step.preview === 'explain') {
    return (
      <section className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
        <p className="text-xs font-semibold uppercase text-brand-blue">{sales.eyebrow}</p>
        <h3 className="mt-1 font-semibold text-gray-900">{sales.title}</h3>
        <p className="mt-3 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
          {snapshots.explain.answer.replace(/\*\*(.*?)\*\*/g, '$1')}
        </p>
        <p className="mt-2 text-xs text-gray-500">
          {sales.citationsLabel}: {snapshots.explain.citations.join(' · ')}
        </p>
      </section>
    );
  }

  const flowShell = {
    compact: true as const,
    staticPreview: true as const,
    defaultSection: defaultSectionForPreview(step.preview),
    schedulingLayout: schedulingLayoutForPreview(step.preview),
  };

  if (step.preview === 'load') {
    return <PlantBaselineDashboard key={step.id} {...flowShell} queue={snapshots.load.queue} />;
  }

  if (step.preview === 'at_risk') {
    return (
      <PlantBaselineDashboard
        key={step.id}
        {...flowShell}
        queue={snapshots.load.queue}
        highlightColumns={['finish', 'status']}
      />
    );
  }

  if (
    step.preview === 'rush' ||
    step.preview === 'qa' ||
    step.preview === 'copilot' ||
    step.preview === 'timeline' ||
    step.preview === 'accept'
  ) {
    const isQa = step.preview === 'qa';
    const data = isQa ? qa : rush;
    return (
      <PlantBaselineDashboard
        key={step.id}
        {...flowShell}
        queue={data.queue}
        eventType={isQa ? 'qa_fail' : 'rush'}
        explanation={data.explanation}
        accepted={step.preview === 'accept'}
        acceptDisabled={step.preview !== 'accept'}
        schedulingLayout={flowShell.schedulingLayout ?? 'full'}
      />
    );
  }

  return <PlantBaselineDashboard key={step.id} {...flowShell} queue={snapshots.load.queue} />;
}
