import { useEffect, useState } from 'react';

const STEP_MS = 2200;

type PlantPlanGeneratingModalProps = {
  title: string;
  subtitle: string;
  steps: string[];
};

export function PlantPlanGeneratingModal({ title, subtitle, steps }: PlantPlanGeneratingModalProps) {
  const [step, setStep] = useState(0);
  const last = Math.max(steps.length - 1, 0);

  useEffect(() => {
    if (step >= last) return undefined;
    const id = window.setTimeout(() => setStep((current) => Math.min(current + 1, last)), STEP_MS);
    return () => window.clearTimeout(id);
  }, [step, last]);

  const current = steps[step] ?? title;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/45 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-generating-title"
        aria-describedby="plan-generating-step"
        className="w-full max-w-md rounded-2xl bg-white px-6 py-7 shadow-2xl"
      >
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="h-11 w-11 shrink-0 rounded-full border-4 border-brand-green/20 border-t-brand-green animate-spin"
          />
          <div>
            <h2 id="plan-generating-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <p id="plan-generating-step" aria-live="polite" className="mt-6 text-sm font-medium text-gray-900">
          {current}
        </p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
          <div
            className="h-full rounded-full bg-brand-green transition-all duration-700"
            style={{ width: `${Math.round(((step + 0.45) / steps.length) * 100)}%` }}
          />
        </div>

        <ol className="mt-5 space-y-2.5">
          {steps.map((label, index) => {
            const state = index < step ? 'done' : index === step ? 'current' : 'waiting';
            return (
              <li key={label} className="flex items-start gap-2.5 text-sm">
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    state === 'done'
                      ? 'bg-brand-green text-white'
                      : state === 'current'
                        ? 'bg-brand-green/15 text-brand-green-dark ring-2 ring-brand-green/40'
                        : 'bg-gray-100 text-gray-300'
                  }`}
                >
                  {state === 'done' ? '✓' : state === 'current' ? '•' : ''}
                </span>
                <span
                  className={
                    state === 'current'
                      ? 'font-medium text-gray-900'
                      : state === 'done'
                        ? 'text-gray-600'
                        : 'text-gray-400'
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
