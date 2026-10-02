import { useEffect } from 'react';
import type { PlantEventType } from '../../../demo/plant/plantDemoTypes';
import { RichList, RichParagraph, substitutePlaceholders } from './RichMessage';

type PlantPlanReviewModalProps = {
  open: boolean;
  lineLabel: string;
  eventType: PlantEventType;
  summaryLine?: string;
  copy: {
    title: string;
    eventRush: string;
    eventQa: string;
    lead: string;
    bullets: readonly string[];
    hint: string;
    cta: string;
  };
  onReview: () => void;
};

export function PlantPlanReviewModal({
  open,
  lineLabel,
  eventType,
  summaryLine,
  copy,
  onReview,
}: PlantPlanReviewModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  if (!open) return null;

  const vars = { line: lineLabel };
  const eventLabel = eventType === 'qa_fail' ? copy.eventQa : copy.eventRush;
  const bullets = copy.bullets.map((line) => substitutePlaceholders(line, vars));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-review-title"
      aria-describedby="plan-review-desc"
    >
      <div className="absolute inset-0 bg-black/45" aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-amber-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-lg text-amber-800"
            aria-hidden
          >
            ⚠
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">{eventLabel}</p>
            <h2 id="plan-review-title" className="mt-1 text-lg font-semibold text-gray-900">
              {copy.title}
            </h2>
          </div>
        </div>
        <div id="plan-review-desc" className="mt-4 space-y-3">
          <RichParagraph text={substitutePlaceholders(copy.lead, vars)} className="text-sm text-gray-700" />
          {summaryLine?.trim() ? (
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              {summaryLine.trim()}
            </p>
          ) : null}
          <RichList items={bullets} />
          <p className="text-xs text-gray-500">{copy.hint}</p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReview}
            className="inline-flex w-full items-center justify-center rounded-lg bg-brand-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-dark sm:w-auto"
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
