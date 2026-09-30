import { useState } from 'react';
import type { PlantFlowPreviewKind, PlantFlowStepConfig } from '../../../content/plantFlowSteps';
import type { PlantFlowSnapshots } from '../../../demo/plant/plantFlowSnapshots';
import { primaryPoFromPending } from '../../../demo/plant/plantEventUtils';
import { plantLineById, type PlantLineId } from '../../../demo/plant/plantLines';
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
    case 'rush_refresh':
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
  const [lineId, setLineId] = useState<PlantLineId>('line-1');
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
    return (
      <div>
        {lineId === 'line-2' && (
          <p className="mb-3 text-sm text-gray-600">{m.demoPlant.tourLinePreviewNote}</p>
        )}
        <PlantBaselineDashboard
          key={step.id}
          {...flowShell}
          queue={snapshots.load.queue}
          selectedLineId={lineId}
          onLineChange={(nextId) => setLineId(plantLineById(nextId).id)}
        />
      </div>
    );
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
    step.preview === 'rush_refresh' ||
    step.preview === 'qa' ||
    step.preview === 'copilot' ||
    step.preview === 'timeline' ||
    step.preview === 'accept'
  ) {
    const isQa = step.preview === 'qa';
    const isRefresh = step.preview === 'rush_refresh';
    const data = isQa ? qa : isRefresh ? snapshots.refresh : rush;
    const eventType = isQa ? 'qa_fail' : 'rush';
    const highlightPo = primaryPoFromPending(eventType, data.diff, data.queue);
    return (
      <PlantBaselineDashboard
        key={step.id}
        {...flowShell}
        queue={data.queue}
        eventType={eventType}
        explanation={data.explanation}
        eventHighlightPo={highlightPo}
        accepted={step.preview === 'accept'}
        acceptDisabled={step.preview !== 'accept'}
        schedulingLayout={flowShell.schedulingLayout ?? 'full'}
      />
    );
  }

  return <PlantBaselineDashboard key={step.id} {...flowShell} queue={snapshots.load.queue} />;
}
