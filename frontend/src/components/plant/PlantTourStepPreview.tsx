import { useEffect, useState } from 'react';
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
  faithful: boolean;
} {
  switch (stepIndex) {
    case 0:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: true,
        mode: 'calm',
        accepted: false,
        faithful: false,
      };
    case 1:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        highlightColumns: ['finish', 'status'],
        mode: 'calm',
        accepted: false,
        faithful: false,
      };
    case 2:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'full',
        mode: 'rush',
        accepted: false,
        faithful: true,
      };
    case 3:
      return {
        defaultSection: 'queue',
        showProgramTimeline: true,
        highlightColumns: ['status'],
        mode: 'qa',
        accepted: false,
        faithful: true,
      };
    case 4:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'full',
        mode: 'qa',
        accepted: false,
        faithful: true,
      };
    case 5:
      return {
        defaultSection: 'scheduling',
        showProgramTimeline: true,
        schedulingLayout: 'timeline-only',
        mode: 'qa',
        accepted: true,
        faithful: true,
      };
    default:
      return {
        defaultSection: 'dashboard',
        showProgramTimeline: true,
        mode: 'calm',
        accepted: false,
        faithful: false,
      };
  }
}

export function PlantTourStepPreview({ stepIndex, snapshots }: PlantTourStepPreviewProps) {
  const { messages: m } = useLocale();
  const d = m.demoPlant;
  const cfg = tourStepNav(stepIndex);
  const [lineId, setLineId] = useState<PlantLineId>('line-1');
  const [previewAccepted, setPreviewAccepted] = useState(false);
  const showLineControl = stepIndex <= 1;

  useEffect(() => {
    setPreviewAccepted(false);
  }, [stepIndex]);

  const eventData =
    cfg.mode === 'rush' ? snapshots.rush : cfg.mode === 'qa' ? snapshots.qa : null;
  const queue = eventData?.queue ?? snapshots.load.queue;
  const eventType = cfg.mode === 'rush' ? 'rush' : cfg.mode === 'qa' ? 'qa_fail' : undefined;
  const explanation = eventData?.explanation;
  const eventHighlightPo =
    eventType && eventData
      ? primaryPoFromPending(eventType, eventData.diff, eventData.queue)
      : undefined;

  const eventActive = Boolean(eventType && explanation);
  const accepted = cfg.accepted || previewAccepted;
  const uiNote = d.tourUiNotes[stepIndex] ?? '';

  return (
    <div key={`tour-preview-${stepIndex}`} className="mt-8 w-full border-t border-gray-100 pt-8">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green">
        {d.tourLivePreview}
      </p>
      {uiNote ? <p className="mb-3 text-sm text-gray-600">{uiNote}</p> : null}
      {(stepIndex === 2 || stepIndex === 3) && (
        <p className="mb-3 text-sm text-gray-600">
          {stepIndex === 2 ? d.tourInjectNoteRush : d.tourInjectNoteQa}
        </p>
      )}
      {stepIndex === 3 && (
        <p className="mb-3 text-xs text-gray-500">{d.tourSapRefreshHint}</p>
      )}
      {showLineControl && lineId === 'line-2' && (
        <p className="mb-3 text-sm text-gray-600">{d.tourLinePreviewNote}</p>
      )}
      <PlantBaselineDashboard
        key={`tour-dashboard-${stepIndex}`}
        experience="ux"
        queue={queue}
        selectedLineId={showLineControl ? lineId : 'line-1'}
        onLineChange={
          showLineControl ? (nextId) => setLineId(plantLineById(nextId).id) : undefined
        }
        compact={false}
        staticPreview
        staticPreviewFaithful={cfg.faithful}
        showProgramTimeline={cfg.showProgramTimeline}
        defaultSection={cfg.defaultSection}
        highlightColumns={cfg.highlightColumns}
        schedulingLayout={cfg.schedulingLayout ?? 'full'}
        eventType={eventType ?? null}
        explanation={explanation ?? null}
        eventHighlightPo={eventHighlightPo}
        explainPo={eventHighlightPo}
        accepted={accepted}
        acceptDisabled={stepIndex !== 5}
        onAccept={
          eventActive && stepIndex >= 2 && stepIndex <= 5
            ? () => setPreviewAccepted(true)
            : undefined
        }
      />
    </div>
  );
}
