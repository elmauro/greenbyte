import { useLocale } from '../../i18n';

export function PlantDemoTopBar() {
  const { messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-t-xl bg-[#2d3164] px-4 py-3 text-white sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green text-sm font-bold">
          G
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold">{s.brandLine}</p>
          <p className="truncate text-xs text-white/75">{s.facilityLine}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
        <span className="hidden items-center gap-1 sm:inline-flex">
          <CalendarIcon />
          {s.dateRange}
        </span>
        <span className="inline-flex items-center gap-1">
          <ClockIcon />
          {s.clockLabel}
        </span>
        <span className="hidden h-4 w-px bg-white/30 sm:block" aria-hidden />
        <button type="button" className="rounded p-1 hover:bg-white/10" aria-label={s.notificationsAria}>
          <BellIcon />
        </button>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green/90 text-xs font-semibold">
          PL
        </span>
      </div>
    </header>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-3.5 w-3.5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  );
}
