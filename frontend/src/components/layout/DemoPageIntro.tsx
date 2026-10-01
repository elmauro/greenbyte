import type { ReactNode } from 'react';

type DemoPageIntroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  note?: string;
  children?: ReactNode;
};

/** Shared intro band for the signed-in demo pages. Matches the site header width. */
export function DemoPageIntro({ eyebrow, title, subtitle, note, children }: DemoPageIntroProps) {
  return (
    <section className="border-b border-gray-100 bg-gradient-to-br from-brand-blue/5 via-white to-brand-green/5 py-10">
      <div className="site-container-demo">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-green">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-blue">{title}</h1>
        {subtitle ? (
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray-600">{subtitle}</p>
        ) : null}
        {note ? <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">{note}</p> : null}
        {children}
      </div>
    </section>
  );
}

type DemoPageBodyProps = {
  children: ReactNode;
  className?: string;
};

/** Body column aligned with the site header and the intro band. */
export function DemoPageBody({ children, className = '' }: DemoPageBodyProps) {
  return <div className={`site-container-demo space-y-8 py-8 ${className}`}>{children}</div>;
}
