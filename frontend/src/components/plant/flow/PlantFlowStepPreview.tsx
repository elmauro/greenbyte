import type { PlantFlowStepConfig } from '../../../content/plantFlowSteps';
import type { PlantFlowSnapshots } from '../../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../../i18n';
import { PlantBaselineDashboard } from '../PlantBaselineDashboard';
import { PlantScheduleWorkspace } from '../PlantScheduleWorkspace';

type PlantFlowStepPreviewProps = {
  step: PlantFlowStepConfig;
  snapshots: PlantFlowSnapshots;
};

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

  if (
    step.preview === 'rush' ||
    step.preview === 'qa' ||
    step.preview === 'copilot' ||
    step.preview === 'timeline' ||
    step.preview === 'accept'
  ) {
    const eventType = step.preview === 'qa' ? 'qa_fail' : 'rush';
    const data = step.preview === 'qa' ? qa : rush;
    return (
      <PlantScheduleWorkspace
        queue={data.queue}
        eventType={eventType}
        explanation={data.explanation}
        accepted={step.preview === 'accept'}
        acceptDisabled={step.preview !== 'accept'}
        compact
      />
    );
  }

  return (
    <PlantBaselineDashboard
      queue={snapshots.load.queue}
      highlightColumns={step.preview === 'at_risk' ? ['finish', 'status'] : undefined}
      compact
    />
  );
}
