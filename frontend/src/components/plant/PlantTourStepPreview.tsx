import { useState } from 'react';
import type { PlantFlowSnapshots } from '../../demo/plant/plantFlowSnapshots';
import { primaryPoFromPending } from '../../demo/plant/plantEventUtils';
import { plantLineById, type PlantLineId } from '../../demo/plant/plantLines';
import { useLocale } from '../../i18n';
import type { PlantNavSection, QueueColumnHighlight } from './PlantBaselineDashboard';
import { PlantBaselineDashboard } from './PlantBaselineDashboard';

type PlantTourStepPreviewProps = {
  /** Guided tour step index 0–5 */
  stepIndex: number;
  snapshots: PlantFlowSnapshots;
};

function tourStepNav(stepIndex: number): {
  defaultSection: PlantNavSection;
  showProgramTimeline: boolean;
  highlightColumns?: QueueColumnHighlight[];
  schedulingLayout?: 'full' | 'timeline-only';
  mode: 'calm' | 'rush' | 'qa';
  accepted: boolean;
} {
  switch (stepIndex) {
    case 0:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: false,
        mode: 'calm',
        accepted: false,
      };
    case 1:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        highlightColumns: ['finish', 'status'],
        mode: 'calm',
        accepted: false,
      };
    case 2:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        mode: 'rush',
        accepted: false,
      };
    case 3:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        mode: 'qa',
        accepted: false,
      };
    case 4:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'full',
        mode: 'qa',
        accepted: false,
      };
    case 5:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'timeline-only',
        mode: 'qa',
        accepted: true,
      };
    default:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: true,
        mode: 'calm',
        accepted: false,
      };
  }
}

export function PlantTourStepPreview({ stepIndex, snapshots }: PlantTourStepPreviewProps) {
  const { messages: m } = useLocale();
  const label = m.demoPlant.tourLivePreview;
  const cfg = tourStepNav(stepIndex);
  const [lineId, setLineId] = useState<PlantLineId>('line-1');
  const showLineControl = stepIndex === 0;

  const eventData =
    cfg.mode === 'rush' ? snapshots.rush : cfg.mode === 'qa' ? snapshots.qa : null;
  const queue = eventData?.queue ?? snapshots.load.queue;
  const eventType = cfg.mode === 'rush' ? 'rush' : cfg.mode === 'qa' ? 'qa_fail' : undefined;
  const explanation = eventData?.explanation;
  const eventHighlightPo =
    eventType && eventData
      ? primaryPoFromPending(eventType, eventData.diff, eventData.queue)
      : undefined;

  return (
    <div key={`tour-preview-${stepIndex}`} className="mt-8 w-full border-t border-gray-100 pt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green">{label}</p>
      {(stepIndex === 2 || stepIndex === 3) && (
        <p className="mb-3 text-sm text-gray-600">
          {stepIndex === 2 ? m.demoPlant.tourInjectNoteRush : m.demoPlant.tourInjectNoteQa}
        </p>
      )}
      {stepIndex === 3 && (
        <p className="mb-3 text-xs text-gray-500">{m.demoPlant.tourSapRefreshHint}</p>
      )}
      {showLineControl && lineId === 'line-2' && (
        <p className="mb-3 text-sm text-gray-600">{m.demoPlant.tourLinePreviewNote}</p>
      )}
      <PlantBaselineDashboard
        key={`tour-dashboard-${stepIndex}`}
        queue={queue}
        selectedLineId={showLineControl ? lineId : undefined}
        onLineChange={
          showLineControl ? (nextId) => setLineId(plantLineById(nextId).id) : undefined
        }
        compact
        staticPreview
        showProgramTimeline={cfg.showProgramTimeline}
        defaultSection={cfg.defaultSection}
        highlightColumns={cfg.highlightColumns}
        schedulingLayout={cfg.schedulingLayout ?? 'full'}
        eventType={eventType ?? null}
        explanation={explanation ?? null}
        eventHighlightPo={eventHighlightPo}
        accepted={cfg.accepted}
        acceptDisabled={stepIndex !== 5}
      />
    </div>
  );
}
