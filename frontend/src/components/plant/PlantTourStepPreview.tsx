import type { PlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../i18n';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';
import { PlantScheduleWorkspace } from './PlantScheduleWorkspace';

type PlantTourStepPreviewProps = {
  /** Guided tour step index 0–4 */
  stepIndex: number;
  snapshots: PlantFlowSnapshots;
};

export function PlantTourStepPreview({ stepIndex, snapshots }: PlantTourStepPreviewProps) {
  const { messages: m } = useLocale();
  const label = m.demoPlant.tourLivePreview;

  if (stepIndex <= 1) {
    return (
      <div className="mt-8 w-full border-t border-gray-100 pt-8">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green">{label}</p>
        <PlantBaselineDashboard
          queue={snapshots.load.queue}
          compact
          highlightColumns={stepIndex === 1 ? ['finish', 'status'] : undefined}
        />
      </div>
    );
  }

  const rush = snapshots.rush;

  return (
    <div className="mt-8 w-full border-t border-gray-100 pt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green">{label}</p>
      {stepIndex === 2 && (
        <p className="mb-3 text-sm text-gray-600">{m.demoPlant.tourInjectNote}</p>
      )}
      <PlantScheduleWorkspace
        queue={rush.queue}
        eventType="rush"
        explanation={rush.explanation}
        accepted={stepIndex >= 4}
        acceptDisabled={stepIndex < 4}
        compact
      />
    </div>
  );
}
