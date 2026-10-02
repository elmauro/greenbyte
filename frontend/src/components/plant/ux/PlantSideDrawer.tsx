import type { ReactNode } from 'react';
import type { Locale } from '../../../i18n/LocaleContext';

type PlantSideDrawerProps = {
  open: boolean;
  onClose: () => void;
  closeLabel: string;
  titleId: string;
  title: string;
  subtitle?: string;
  locale?: Locale;
  children: ReactNode;
};

export function PlantSideDrawer({
  open,
  onClose,
  closeLabel,
  titleId,
  title,
  subtitle,
  locale,
  children,
}: PlantSideDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-black/30" aria-label={closeLabel} onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div className="min-w-0 pt-0.5">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-xs leading-relaxed text-gray-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" lang={locale}>
          {children}
        </div>
      </aside>
    </div>
  );
}
