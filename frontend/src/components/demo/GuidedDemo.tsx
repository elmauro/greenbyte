import { useState } from 'react';

export type DemoStep = {
  title: string;
  body: string;
  imageSrc?: string;
  imageAlt?: string;
  highlight?: string;
};

type GuidedDemoProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
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
};

export function GuidedDemo({
  eyebrow,
  title,
  subtitle,
  steps,
  labels,
  otherDemo,
}: GuidedDemoProps) {
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div className="pb-16">
      <section className="border-b border-gray-100 bg-gradient-to-br from-brand-green/10 via-white to-brand-blue/5 py-12">
        <div className="site-container max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold text-brand-blue sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg text-gray-600">{subtitle}</p>
          {otherDemo && (
            <a
              href={otherDemo.href}
              className="mt-6 inline-flex text-sm font-semibold text-brand-green hover:text-brand-green-dark"
            >
              {otherDemo.label} →
            </a>
          )}
        </div>
      </section>

      <div className="site-container mt-10 max-w-5xl">
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
            <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
          </div>
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="leading-relaxed text-gray-700">{step.body}</p>
              {step.highlight && (
                <p className="mt-4 rounded-lg border border-brand-green/30 bg-brand-green/5 px-4 py-3 text-sm font-medium text-brand-green-dark">
                  {step.highlight}
                </p>
              )}
            </div>
            {step.imageSrc && (
              <figure className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img
                  src={step.imageSrc}
                  alt={step.imageAlt ?? step.title}
                  className="h-auto w-full object-cover object-top"
                  loading="lazy"
                />
                <figcaption className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">
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
      </div>
    </div>
  );
}
