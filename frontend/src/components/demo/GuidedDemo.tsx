import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DemoPageBody, DemoPageIntro } from '../layout/DemoPageIntro';

export type DemoStep = {
  title: string;
  /** Colloquial one-liner for this step */
  plainLine?: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  highlight?: string;
};

export type DemoPlainLanguage = {
  sectionTitle: string;
  problemHeading: string;
  problem: string;
  analogyHeading: string;
  analogy: string;
  walkthroughHeading: string;
  walkthroughSteps: string[];
  tagline: string;
};

type GuidedDemoProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  plainLanguage: DemoPlainLanguage;
  steps: DemoStep[];
  labels: {
    step: string;
    of: string;
    back: string;
    next: string;
    finish: string;
    restart: string;
  };
  otherDemo?: { label: string; href: string };
  architectureLink?: { label: string; href: string };
  /** Same React widgets as /demo/plant (replaces optional step PNG). */
  renderStepPreview?: (stepIndex: number) => ReactNode;
};

export function GuidedDemo({
  eyebrow,
  title,
  subtitle,
  plainLanguage,
  steps,
  labels,
  otherDemo,
  architectureLink,
  renderStepPreview,
}: GuidedDemoProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div className="pb-16">
      <DemoPageIntro eyebrow={eyebrow} title={title} subtitle={subtitle}>
          <div className="mt-6 flex flex-wrap gap-4">
            {otherDemo && (
              <Link
                to={otherDemo.href}
                className="inline-flex text-sm font-semibold text-brand-green hover:text-brand-green-dark"
              >
                {otherDemo.label} →
              </Link>
            )}
            {architectureLink && (
              <Link
                to={architectureLink.href}
                className="inline-flex text-sm font-semibold text-brand-blue hover:text-brand-blue/80"
              >
                {architectureLink.label} →
              </Link>
            )}
          </div>
      </DemoPageIntro>

      <DemoPageBody>
        <aside className="mb-10 rounded-2xl border border-brand-blue/15 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold text-brand-blue">{plainLanguage.sectionTitle}</h2>
          <p className="mt-4 text-sm font-semibold text-gray-900">{plainLanguage.problemHeading}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{plainLanguage.problem}</p>
          <p className="mt-5 text-sm font-semibold text-gray-900">{plainLanguage.analogyHeading}</p>
          <p className="mt-2 leading-relaxed text-gray-700">{plainLanguage.analogy}</p>
          <p className="mt-5 text-sm font-semibold text-gray-900">{plainLanguage.walkthroughHeading}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            {plainLanguage.walkthroughSteps.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
          <p className="mt-5 rounded-lg bg-brand-green/5 px-4 py-3 text-sm font-medium text-brand-green-dark">
            {plainLanguage.tagline}
          </p>
        </aside>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-500">
            {labels.step} {index + 1} {labels.of} {steps.length}
          </p>
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-8 rounded-full transition-colors ${
                  i <= index ? 'bg-brand-green' : 'bg-gray-200'
                }`}
                aria-hidden
              />
            ))}
          </div>
        </div>

        <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 sm:px-8">
            <h2 className="text-xl font-semibold text-brand-blue">{step.title}</h2>
          </div>
          <div className="p-6 sm:p-8">
            <div className="w-full max-w-3xl">
              {step.plainLine && (
                <p className="mb-4 text-base font-medium leading-snug text-brand-blue">{step.plainLine}</p>
              )}
              <p className="leading-relaxed text-gray-700">{step.body}</p>
              {step.highlight && (
                <p className="mt-4 rounded-lg border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm font-medium text-brand-green-dark">
                  {step.highlight}
                </p>
              )}
            </div>
            {renderStepPreview?.(index)}
            {!renderStepPreview && step.imageSrc && (
              <figure className="mt-8 w-full border-t border-gray-100 pt-8">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-md">
                  <img
                    src={step.imageSrc}
                    alt={step.imageAlt ?? step.title}
                    className="block h-auto min-h-[240px] w-full max-w-none object-contain object-center sm:min-h-[320px] lg:min-h-[420px]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="mt-2 text-center text-xs text-gray-500">
                  {step.imageAlt ?? 'Concept mockup — demo data only'}
                </figcaption>
              </figure>
            )}
          </div>
        </article>

        <div className="mt-8 flex flex-wrap justify-between gap-4">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => setIndex((i) => i - 1)}
            className="rounded-full border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labels.back}
          </button>
          <div className="flex gap-3">
            {isLast ? (
              <>
                <button
                  type="button"
                  onClick={() => setIndex(0)}
                  className="rounded-full border border-brand-blue/30 px-6 py-2.5 text-sm font-semibold text-brand-blue hover:bg-brand-blue/5"
                >
                  {labels.restart}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-dark"
              >
                {labels.next}
              </button>
            )}
          </div>
        </div>
      </DemoPageBody>
    </div>
  );
}
