import type { PlantExplanation, QueueRow } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';
import { PlantCopilotWowPanel } from './PlantCopilotWowPanel';
import { PlantDemoTopBar } from './PlantDemoTopBar';
import { PlantProgramGantt } from './PlantProgramGantt';

type PlantScheduleWorkspaceProps = {
  queue: QueueRow[];
  explanation: PlantExplanation | null;
  accepted: boolean;
  onAccept?: () => void;
  acceptDisabled?: boolean;
  compact?: boolean;
  eventHighlightPo?: string;
};

export function PlantScheduleWorkspace({
  queue,
  explanation,
  accepted,
  onAccept,
  acceptDisabled,
  compact = false,
  eventHighlightPo,
}: PlantScheduleWorkspaceProps) {
  const { messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const copy = m.plantMvp;
  const activeCount = queue.filter((r) => r.status !== 'COMPLETE').length;
  const rushPo = eventHighlightPo;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <PlantDemoTopBar />

      {explanation && (
        <div className="flex items-start justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950">
          <p className="flex items-center gap-2">
            <span className="text-amber-600">⚠</span>
            {explanation.alertBanner}
          </p>
          <button type="button" className="shrink-0 text-amber-700/60 hover:text-amber-900" aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <PlantProgramGantt rows={queue} rushPo={rushPo} compact={compact} />
        <PlantCopilotWowPanel explanation={explanation} compact={compact} />
      </div>

      <div className="flex flex-col items-stretch justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center">
        <p className="text-sm text-gray-600">
          {s.footerTotal
            .replace('{count}', String(activeCount))
            .replace('{runtime}', s.demoRuntime)}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={acceptDisabled || accepted}
            onClick={onAccept}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-green px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-dark disabled:opacity-40"
          >
            ✓ {accepted ? copy.actions.accepted : copy.actions.accept}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            ✎ {s.adjustManually}
          </button>
        </div>
      </div>
    </div>
  );
}
