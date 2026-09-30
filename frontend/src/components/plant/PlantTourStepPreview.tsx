import type { PlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { useLocale } from '../../i18n';
import type { PlantNavSection, QueueColumnHighlight } from './PlantBaselineDashboard';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

type PlantTourStepPreviewProps = {
  /** Guided tour step index 0–4 */
  stepIndex: number;
  snapshots: PlantFlowSnapshots;
};

function tourStepNav(stepIndex: number): {
  defaultSection: PlantNavSection;
  showProgramTimeline: boolean;
  highlightColumns?: QueueColumnHighlight[];
  schedulingLayout?: 'full' | 'timeline-only';
  withRushEvent: boolean;
  accepted: boolean;
} {
  switch (stepIndex) {
    case 0:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: false,
        withRushEvent: false,
        accepted: false,
      };
    case 1:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        highlightColumns: ['finish', 'status'],
        withRushEvent: false,
        accepted: false,
      };
    case 2:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        withRushEvent: true,
        accepted: false,
      };
    case 3:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'full',
        withRushEvent: true,
        accepted: false,
      };
    case 4:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'timeline-only',
        withRushEvent: true,
        accepted: true,
      };
    default:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: true,
        withRushEvent: false,
        accepted: false,
      };
  }
}

export function PlantTourStepPreview({ stepIndex, snapshots }: PlantTourStepPreviewProps) {
  const { messages: m } = useLocale();
  const label = m.demoPlant.tourLivePreview;
  const rush = snapshots.rush;
  const cfg = tourStepNav(stepIndex);

  const queue = cfg.withRushEvent ? rush.queue : snapshots.load.queue;

  return (
    <div key={`tour-preview-${stepIndex}`} className="mt-8 w-full border-t border-gray-100 pt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green">{label}</p>
      {stepIndex === 2 && (
        <p className="mb-3 text-sm text-gray-600">{m.demoPlant.tourInjectNote}</p>
      )}
      <PlantBaselineDashboard
        key={`tour-dashboard-${stepIndex}`}
        queue={queue}
        compact
        staticPreview
        showProgramTimeline={cfg.showProgramTimeline}
        defaultSection={cfg.defaultSection}
        highlightColumns={cfg.highlightColumns}
        schedulingLayout={cfg.schedulingLayout ?? 'full'}
        eventType={cfg.withRushEvent ? 'rush' : undefined}
        explanation={cfg.withRushEvent ? rush.explanation : undefined}
        accepted={cfg.accepted}
        acceptDisabled={stepIndex !== 4}
      />
    </div>
  );
}
