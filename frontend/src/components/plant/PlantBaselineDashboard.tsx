export type QueueColumnHighlight = 'finish' | 'status' | 'reason';
export type PlantNavSection = 'dashboard' | 'queue' | 'scheduling' | 'copilot';

import { useEffect, useId, useRef, useState } from 'react';
import type {
  PlantEventType,
  PlantExplanation,
  QueueRow,
} from '../../demo/plant/plantDemoTypes';
import { speciesDisplay } from '../../demo/plant/plantSpeciesDisplay';
import type { Locale } from '../../i18n/LocaleContext';
import { useLocale } from '../../i18n';
import { PlantBatchExplainChat } from './PlantBatchExplainChat';
import { PlantCopilotWowPanel } from './PlantCopilotWowPanel';
import { PlantProgramGantt } from './PlantProgramGantt';

type PlantBaselineDashboardProps = {
  queue: QueueRow[];
  highlightColumns?: QueueColumnHighlight[];
  compact?: boolean;
  eventType?: PlantEventType | null;
  explanation?: PlantExplanation | null;
  accepted?: boolean;
  /** True when this plan version was accepted — blocks stale BFF `lastEvent` from re-opening alerts. */
  planAcknowledged?: boolean;
  onAccept?: () => void;
  acceptDisabled?: boolean;
  /** Tour / flow: hide scheduling & copilot sections entirely. */
  showProgramTimeline?: boolean;
  /** Initial sidebar section (interactive demo defaults to dashboard). */
  defaultSection?: PlantNavSection;
  /** Flow gallery: fixed section per step, no live notification badges. */
  staticPreview?: boolean;
  /** Scheduling section layout when a replan is pending review. */
  schedulingLayout?: 'full' | 'timeline-only';
};

function formatFinish(finish: string, locale: Locale, pattern: string) {
  const [datePart, timePart] = finish.split(' ');
  const d = new Date(`${datePart}T${timePart ?? '12:00'}:00`);
  if (Number.isNaN(d.getTime())) return finish;
  const dateStr = d.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    day: 'numeric',
    month: locale === 'es' ? 'long' : 'short',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString(locale === 'es' ? 'es-ES' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return pattern.replace('{date}', dateStr).replace('{time}', timeStr);
}

function formatPo(po: string) {
  return `PO-${po.slice(-6)}`;
}

const NAV_ITEMS: { id: PlantNavSection; labelKey: 'panel' | 'queue' | 'scheduling' | 'copilot' }[] = [
  { id: 'dashboard', labelKey: 'panel' },
  { id: 'queue', labelKey: 'queue' },
  { id: 'scheduling', labelKey: 'scheduling' },
  { id: 'copilot', labelKey: 'copilot' },
];

export function PlantBaselineDashboard({
  queue,
  highlightColumns = [],
  compact = false,
  eventType = null,
  explanation = null,
  accepted = false,
  planAcknowledged = false,
  onAccept,
  acceptDisabled = false,
  showProgramTimeline = true,
  defaultSection = 'dashboard',
  staticPreview = false,
  schedulingLayout = 'full',
}: PlantBaselineDashboardProps) {
  const { locale, messages: m } = useLocale();
  const b = m.plantMvp.baselineDashboard;
  const copy = m.plantMvp;
  const schedule = m.plantMvp.scheduleShell;
  const hi = new Set(highlightColumns);
  const active = queue.filter((r) => r.status !== 'COMPLETE');
  const totalKg = active.reduce((s, r) => s + r.kg, 0);
  const nextRow = active[0];
  const utilization = Math.min(95, 58 + active.length * 2);
  const eventActive = Boolean(eventType && explanation);
  /** Rush/QA still awaiting human accept — hide event chrome once accepted. */
  const eventPendingReview = eventActive && !accepted && !planAcknowledged;
  const schedulingActionPending = !staticPreview && eventPendingReview;
  const rushPo = eventType === 'rush' ? '1002307551' : undefined;
  const visibleNav = NAV_ITEMS.filter(
    (item) => showProgramTimeline || item.id === 'dashboard' || item.id === 'queue',
  );

  const [activeSection, setActiveSection] = useState<PlantNavSection>(() => {
    if (!showProgramTimeline) return defaultSection === 'scheduling' || defaultSection === 'copilot' ? 'queue' : defaultSection;
    return defaultSection;
  });

  const [queueUpdateUnread, setQueueUpdateUnread] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const bellWrapRef = useRef<HTMLDivElement>(null);
  const bellMenuId = useId();

  useEffect(() => {
    if (staticPreview) return;
    if (accepted || planAcknowledged) setQueueUpdateUnread(true);
    else setQueueUpdateUnread(false);
  }, [accepted, planAcknowledged, staticPreview]);

  useEffect(() => {
    if (activeSection === 'queue') setQueueUpdateUnread(false);
  }, [activeSection]);

  useEffect(() => {
    if (!bellOpen) return;
    function onDocClick(e: MouseEvent) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [bellOpen]);

  const notificationCount =
    (schedulingActionPending ? 1 : 0) + (queueUpdateUnread ? 1 : 0);

  useEffect(() => {
    if (!showProgramTimeline && (activeSection === 'scheduling' || activeSection === 'copilot')) {
      setActiveSection('queue');
    }
  }, [activeSection, showProgramTimeline]);

  function sectionTitle(): string {
    switch (activeSection) {
      case 'dashboard':
        return b.sectionDashboard;
      case 'queue':
        return b.sectionQueue;
      case 'scheduling':
        return b.sectionScheduling;
      case 'copilot':
        return m.plantMvp.salesChat.title;
    }
  }

  function navBadgeKind(section: PlantNavSection): 'action' | 'info' | null {
    if (staticPreview) return null;
    if (section === 'scheduling' && schedulingActionPending && activeSection !== 'scheduling') {
      return 'action';
    }
    if (section === 'queue' && queueUpdateUnread && activeSection !== 'queue') {
      return 'info';
    }
    return null;
  }

  function renderNavBadge(kind: 'action' | 'info') {
    const label = kind === 'action' ? b.navBadgeScheduling : b.navBadgeQueue;
    return (
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white ${
          kind === 'action' ? 'bg-amber-500' : 'bg-brand-blue'
        }`}
        title={label}
        aria-hidden
      />
    );
  }

  function renderNavButton(item: (typeof visibleNav)[number]) {
    const selected = activeSection === item.id;
    const badge = navBadgeKind(item.id);
    const badgeAria =
      badge === 'action' ? b.navBadgeScheduling : badge === 'info' ? b.navBadgeQueue : undefined;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setActiveSection(item.id)}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
          selected ? 'bg-brand-green/10 font-semibold text-brand-green-dark' : 'text-gray-600 hover:bg-gray-50'
        }`}
        aria-current={selected ? 'page' : undefined}
        aria-label={badgeAria ? `${b.nav[item.labelKey]} — ${badgeAria}` : b.nav[item.labelKey]}
      >
        <span>{b.nav[item.labelKey]}</span>
        {badge && renderNavBadge(badge)}
      </button>
    );
  }

  function goToSection(section: PlantNavSection) {
    setActiveSection(section);
    setBellOpen(false);
  }

  const eventBanner = eventPendingReview && explanation && (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950">
      <span className="text-amber-600">⚠</span>
      <div>
        <p>{explanation.alertBanner}</p>
        {activeSection === 'dashboard' && (
          <p className="mt-1 text-xs font-normal text-amber-900/80">{b.eventBannerHint}</p>
        )}
      </div>
    </div>
  );

  const metricsGrid = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-brand-green/5 to-white p-4 sm:col-span-2 lg:col-span-1">
        <p className="text-xs font-semibold uppercase text-brand-green">{b.summaryTitle}</p>
        <p className="mt-2 text-lg font-bold text-brand-green-dark">
          {eventPendingReview ? b.summaryHeadlineEvent : b.summaryHeadline}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          {eventPendingReview ? b.summaryBulletsEvent : b.summaryBullets}
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 p-4">
        <p className="text-xs text-gray-500">{b.metricLoad}</p>
        <p className="text-xl font-bold text-gray-900">
          {totalKg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')} kg
        </p>
        <div className="mt-2 h-8 rounded bg-gradient-to-r from-brand-green/20 via-brand-green/40 to-brand-green/10" />
      </div>
      <div className="rounded-xl border border-gray-100 p-4">
        <p className="text-xs text-gray-500">{b.metricNextFinish}</p>
        <p className="mt-1 text-sm font-semibold text-gray-900">
          {nextRow ? formatFinish(nextRow.finish, locale, b.finishFormat) : '—'}
        </p>
      </div>
      <div className="rounded-xl border border-gray-100 p-4">
        <p className="text-xs text-gray-500">{b.metricUtilization}</p>
        <p className="text-xl font-bold text-gray-900">{utilization}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand-green" style={{ width: `${utilization}%` }} />
        </div>
      </div>
    </div>
  );

  const queueTable = (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50/90 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">{copy.table.position}</th>
            <th className="px-4 py-3">{b.colPo}</th>
            <th className="px-4 py-3">{b.colSpecies}</th>
            <th className="px-4 py-3">{copy.table.kg}</th>
            <th
              className={`px-4 py-3 ${hi.has('finish') ? 'bg-brand-green/10 ring-1 ring-inset ring-brand-green/30' : ''}`}
            >
              {copy.table.finish}
            </th>
            <th
              className={`px-4 py-3 ${hi.has('status') ? 'bg-brand-green/10 ring-1 ring-inset ring-brand-green/30' : ''}`}
            >
              {copy.table.status}
            </th>
            <th className="w-10 px-2 py-3" aria-label={b.actionsAria} />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {queue.map((row, index) => {
            const sp = speciesDisplay(row.species, locale);
            const isComplete = row.status === 'COMPLETE';
            return (
              <tr key={row.po} className="hover:bg-gray-50/80">
                <td className="px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                    {index + 1}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{formatPo(row.po)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">{sp.common}</p>
                  <p className="text-xs italic text-gray-500">{sp.scientific}</p>
                </td>
                <td className="px-4 py-3 tabular-nums text-gray-800">
                  {row.kg.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US')}
                </td>
                <td
                  className={`px-4 py-3 text-xs leading-snug text-gray-700 ${hi.has('finish') ? 'bg-brand-green/5' : ''}`}
                >
                  {formatFinish(row.finish, locale, b.finishFormat)}
                </td>
                <td className={`px-4 py-3 ${hi.has('status') ? 'bg-brand-green/5' : ''}`}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      isComplete
                        ? 'bg-brand-green/10 text-brand-green-dark'
                        : row.atRisk
                          ? 'bg-amber-50 text-amber-900'
                          : 'bg-brand-green/10 text-brand-green-dark'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isComplete ? 'bg-brand-green/60' : row.atRisk ? 'bg-amber-500' : 'bg-brand-green'
                      }`}
                    />
                    {isComplete
                      ? copy.statusLabels.complete
                      : row.atRisk
                        ? copy.statusLabels.atRisk
                        : copy.statusLabels.planned}
                  </span>
                </td>
                <td className="px-2 py-3 text-center text-gray-400">⋯</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const acceptFooter = eventPendingReview && onAccept && (
    <div className="mt-4 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center">
      <p className="text-sm text-gray-600">
        {schedule.footerTotal
          .replace('{count}', String(active.length))
          .replace('{runtime}', schedule.demoRuntime)}
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
          ✎ {schedule.adjustManually}
        </button>
      </div>
    </div>
  );

  function renderMainSection() {
    switch (activeSection) {
      case 'dashboard':
        return (
          <>
            {eventBanner}
            {metricsGrid}
            {!eventPendingReview && (
              <p className="mt-4 text-sm text-gray-600">
                {copy.copilotIdle} {showProgramTimeline && `(${b.nav.queue} → ${b.nav.scheduling})`}
              </p>
            )}
          </>
        );
      case 'queue':
        return (
          <>
            {eventBanner}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                {eventPendingReview ? b.queueSubtitleEvent : b.queueSubtitle}
              </p>
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {b.sortFilter}
              </button>
            </div>
            {queueTable}
          </>
        );
      case 'scheduling':
        return (
          <>
            {eventBanner}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {eventPendingReview && schedulingLayout === 'full' ? (
                <div className="flex flex-col lg:flex-row">
                  <PlantProgramGantt rows={queue} rushPo={rushPo} compact={compact} />
                  <PlantCopilotWowPanel explanation={explanation} compact={compact} />
                </div>
              ) : (
                <PlantProgramGantt rows={queue} rushPo={rushPo} compact={compact} />
              )}
            </div>
            {acceptFooter}
          </>
        );
      case 'copilot':
        return <PlantBatchExplainChat queue={queue} embedded />;
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f8faf8] shadow-lg">
      <div className="flex min-h-[520px] flex-col md:flex-row">
        {!compact && (
          <aside className="hidden w-52 shrink-0 border-r border-gray-200 bg-white px-3 py-4 md:block">
            <div className="mb-6 flex items-center gap-2 px-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green text-xs font-bold text-white">
                G
              </span>
              <div className="text-[10px] leading-tight">
                <p className="font-bold text-brand-green">GreenByte</p>
                <p className="text-gray-500">{b.tagline}</p>
              </div>
            </div>
            <nav className="space-y-0.5 text-sm">{visibleNav.map(renderNavButton)}</nav>
            <p className="mt-8 px-2 text-[10px] text-gray-500">
              <span className="mr-1 inline-block h-2 w-2 rounded-full bg-brand-green" />
              {b.systemsOk}
              <br />
              {b.lastUpdated}
            </p>
          </aside>
        )}

        <div className="min-w-0 flex-1 bg-white p-4 sm:p-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{b.pageTitle}</h2>
              <p className="mt-1 text-sm font-medium text-brand-green">
                {eventPendingReview ? b.moodLineEvent : b.moodLine}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                <span className="text-brand-green">🛡</span>
                {b.systemStable}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-gray-600">
                📅 {b.headerDate}
              </span>
              {showProgramTimeline && !staticPreview && (
                <div className="relative" ref={bellWrapRef}>
                  <button
                    type="button"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-base hover:bg-gray-50"
                    aria-label={b.notificationsBellAria.replace('{n}', String(notificationCount))}
                    aria-expanded={bellOpen}
                    aria-haspopup="menu"
                    aria-controls={bellMenuId}
                    onClick={() => setBellOpen((o) => !o)}
                  >
                    🔔
                    {notificationCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                  {bellOpen && notificationCount > 0 && (
                    <ul
                      id={bellMenuId}
                      role="menu"
                      className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left text-sm shadow-lg"
                    >
                      {schedulingActionPending && (
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => goToSection('scheduling')}
                          >
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                            <span>
                              <span className="font-semibold text-gray-900">{b.notificationSchedulingTitle}</span>
                              <span className="mt-0.5 block text-xs text-gray-600">{b.notificationSchedulingBody}</span>
                            </span>
                          </button>
                        </li>
                      )}
                      {queueUpdateUnread && (
                        <li role="none">
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-gray-50"
                            onClick={() => goToSection('queue')}
                          >
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue" aria-hidden />
                            <span>
                              <span className="font-semibold text-gray-900">{b.notificationQueueTitle}</span>
                              <span className="mt-0.5 block text-xs text-gray-600">{b.notificationQueueBody}</span>
                            </span>
                          </button>
                        </li>
                      )}
                    </ul>
                  )}
                  {bellOpen && notificationCount === 0 && (
                    <p
                      id={bellMenuId}
                      className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-lg"
                    >
                      {b.notificationsEmpty}
                    </p>
                  )}
                </div>
              )}
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                👤
              </span>
            </div>
          </header>

          {!compact && (
            <nav className="mt-3 flex gap-1 overflow-x-auto border-b border-gray-100 pb-2 md:hidden">
              {visibleNav.map(renderNavButton)}
            </nav>
          )}

          <section className="mt-5">
            <h3 className="text-lg font-semibold text-gray-900">{sectionTitle()}</h3>
            <div className="mt-4">{renderMainSection()}</div>
          </section>
        </div>
      </div>
    </div>
  );
}
