import type { ReactNode } from 'react';
import type { PlantExplanation } from '../../demo/plant/plantDemoTypes';
import { useLocale } from '../../i18n';

const BULLET_ICONS = ['⇅', '▤', '↻'] as const;

type PlantCopilotWowPanelProps = {
  explanation: PlantExplanation | null;
  compact?: boolean;
  /** Render the explanation only, so a parent can place it inside the schedule rail. */
  bare?: boolean;
  /** Calm-state sentence. Defaults to the “open Scheduling” line. */
  idleText?: string;
  /** Control rendered at the end of the title row. */
  headerAction?: ReactNode;
  /** Cap the card stack so the schedule chat keeps the rest of the column. */
  dense?: boolean;
};

export function PlantCopilotWowPanel({
  explanation,
  compact,
  bare = false,
  idleText,
  headerAction,
  dense = false,
}: PlantCopilotWowPanelProps) {
  const { messages: m } = useLocale();
  const copy = m.plantMvp;

  const body = (
    <>
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-gray-900">
          <span className="text-brand-green">✦</span>
          <span className="truncate">{copy.copilotTitle}</span>
        </h3>
        {headerAction ??
          (!bare && (
            <button type="button" className="text-gray-400 hover:text-gray-600" aria-label="Menu">
              ⋮
            </button>
          ))}
      </div>
      <div className={dense ? 'max-h-64 space-y-3 overflow-y-auto p-4' : 'space-y-3 p-4'}>
        <ExplanationCards explanation={explanation} idleText={idleText ?? copy.copilotIdle} />
      </div>
    </>
  );

  if (bare) return <div className="min-w-0">{body}</div>;

  return (
    <aside
      className={`w-full shrink-0 bg-gray-50/50 ${
        compact ? 'xl:w-72 xl:border-l xl:border-gray-200' : 'lg:w-[min(100%,22rem)] xl:w-80'
      }`}
    >
      {body}
    </aside>
  );
}

function ExplanationCards({
  explanation,
  idleText,
}: {
  explanation: PlantExplanation | null;
  idleText: string;
}) {
  if (!explanation) {
    return <p className="text-sm text-gray-600">{idleText}</p>;
  }

  return (
    <>
      {explanation.summary && (
        <p className="text-sm font-medium leading-snug text-gray-900">{explanation.summary}</p>
      )}
      {explanation.bullets.map((bullet, i) => (
        <div key={bullet} className="flex gap-3 rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
              i === 0
                ? 'bg-violet-100 text-violet-700'
                : i === 1
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {BULLET_ICONS[i] ?? '•'}
          </span>
          <p className="text-sm leading-snug text-gray-700">{bullet}</p>
        </div>
      ))}
      {explanation.impact && (
        <div className="space-y-2">
          {explanation.impact.split('·').map((part) => (
            <p
              key={part.trim()}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900"
            >
              ✓ {part.trim()}
            </p>
          ))}
        </div>
      )}
    </>
  );
}
