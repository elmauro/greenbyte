import type { ReactNode } from 'react';

type ArchitectureSectionGroupProps = {
  title: string;
  intro: string;
  syngentaLabel?: string;
  syngentaGoal?: string;
  dataLabel?: string;
  dataSource?: string;
  demoRouteLabel?: string;
  demoRoute?: string;
  children: ReactNode;
};

export function ArchitectureSectionGroup({
  title,
  intro,
  syngentaLabel,
  syngentaGoal,
  dataLabel,
  dataSource,
  demoRouteLabel,
  demoRoute,
  children,
}: ArchitectureSectionGroupProps) {
  return (
    <div className="space-y-8 border-t border-gray-200 pt-12 first:border-t-0 first:pt-0">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-bold text-brand-blue">{title}</h2>
        <p className="mt-3 leading-relaxed text-gray-700">{intro}</p>
        {(syngentaGoal || dataSource || demoRoute) && (
          <dl className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm">
            {syngentaGoal && syngentaLabel && (
              <div>
                <dt className="font-semibold text-gray-900">{syngentaLabel}</dt>
                <dd className="mt-1 text-gray-600">{syngentaGoal}</dd>
              </div>
            )}
            {dataSource && dataLabel && (
              <div>
                <dt className="font-semibold text-gray-900">{dataLabel}</dt>
                <dd className="mt-1 text-gray-600">{dataSource}</dd>
              </div>
            )}
            {demoRoute && demoRouteLabel && (
              <div>
                <dt className="font-semibold text-gray-900">{demoRouteLabel}</dt>
                <dd className="mt-1 font-mono text-brand-green-dark">{demoRoute}</dd>
              </div>
            )}
          </dl>
        )}
      </div>
      <div className="space-y-14">{children}</div>
    </div>
  );
}
