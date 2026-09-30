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
import type { PlantUxHistoryEntry } from '../../demo/plant/plantUxApprovalHistory';
import { PlantHelpDrawer } from './ux/PlantHelpDrawer';
import { PlantUxCompareDrawer } from './ux/PlantUxCompareDrawer';
import { PlantUxHistoryDrawer } from './ux/PlantUxHistoryDrawer';

export type PlantDashboardExperience = 'baseline' | 'ux';
export type PlantQueueFilter = 'all' | 'risk' | 'hold' | 'SWCO' | 'CORN';

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
  /** Lovable UX port — same GreenByte styles, richer flows. */
  experience?: PlantDashboardExperience;
  /** Controlled nav (UX route + URL section). */
  section?: PlantNavSection;
  onSectionChange?: (section: PlantNavSection) => void;
  /** UX route: approval history entries (local demo session). */
  uxApprovalHistory?: PlantUxHistoryEntry[];
};

function filterQueueRows(rows: QueueRow[], filter: PlantQueueFilter): QueueRow[] {
  switch (filter) {
    case 'risk':
      return rows.filter((r) => r.atRisk);
    case 'hold':
      return rows.filter((r) => r.status === 'HOLD');
    case 'SWCO':
      return rows.filter((r) => r.species === 'SWCO');
    case 'CORN':
      return rows.filter((r) => r.species === 'CORN');
    default:
      return rows;
  }
}

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
  experience = 'baseline',
  section: controlledSection,
  onSectionChange,
  uxApprovalHistory = [],
}: PlantBaselineDashboardProps) {
  const { locale, messages: m } = useLocale();
  const b = m.plantMvp.baselineDashboard;
  const ux = m.plantMvp.ux;
  const copy = m.plantMvp;
  const isUx = experience === 'ux';
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

  const [internalSection, setInternalSection] = useState<PlantNavSection>(() => {
    if (!showProgramTimeline) return defaultSection === 'scheduling' || defaultSection === 'copilot' ? 'queue' : defaultSection;
    return defaultSection;
  });
  const sectionControlled = controlledSection !== undefined && onSectionChange !== undefined;
  const activeSection = sectionControlled ? controlledSection : internalSection;
  function setActiveSection(next: PlantNavSection) {
    if (sectionControlled) onSectionChange(next);
    else setInternalSection(next);
  }

  const [queueUpdateUnread, setQueueUpdateUnread] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState<PlantQueueFilter>('all');
  const [selectedPo, setSelectedPo] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const displayQueue = isUx ? filterQueueRows(queue, queueFilter) : queue;
  const shownPo = displayQueue.map((r) => r.po);
  const allShownSelected =
    shownPo.length > 0 && shownPo.every((po) => selectedPo.includes(po));

  function togglePo(po: string) {
    setSelectedPo((prev) => (prev.includes(po) ? prev.filter((p) => p !== po) : [...prev, po]));
  }

  function toggleSelectAllShown() {
    if (allShownSelected) {
      setSelectedPo((prev) => prev.filter((p) => !shownPo.includes(p)));
    } else {
      setSelectedPo((prev) => Array.from(new Set([...prev, ...shownPo])));
    }
  }
  const bellWrapRef = useRef<HTMLDivElement>(null);
  const bellMenuId = useId();

  useEffect(() => {
    if (staticPreview) return;
    if (accepted || planAcknowledged) setQueueUpdateUnread(true);
    else setQueueUpdateUnread(false);
  }, [accepted, planAcknowledged, staticPreview]);

  useEffect(() => {
    if (eventPendingReview) setNotificationDismissed(false);
  }, [eventType, explanation?.alertBanner, eventPendingReview]);

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

  const showSchedulingNotification =
    schedulingActionPending && !(isUx && notificationDismissed);
  const notificationCount =
    (showSchedulingNotification ? 1 : 0) + (queueUpdateUnread ? 1 : 0);

  function statusPill(): { label: string; sub: string; className: string; dot: string } {
    if (eventPendingReview) {
      return {
        label: ux.pillAction,
        sub: ux.pillActionSub,
        className: 'border-amber-200 bg-amber-50 text-amber-950',
        dot: 'bg-amber-500',
      };
    }
    if (isUx && (accepted || planAcknowledged) && queueUpdateUnread) {
      return {
        label: ux.pillApproved,
        sub: ux.pillApprovedSub,
        className: 'border-brand-blue/30 bg-brand-blue/5 text-brand-blue',
        dot: 'bg-brand-blue',
      };
    }
    return {
      label: ux.pillSmooth,
      sub: ux.pillSmoothSub,
      className: 'border-brand-green/25 bg-brand-green/5 text-brand-green-dark',
      dot: 'bg-brand-green',
    };
  }
  const pill = isUx ? statusPill() : null;

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
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-950 sm:flex-row sm:items-start">
      <span className="text-amber-600">⚠</span>
      <div className="min-w-0 flex-1">
        {isUx && (
          <p className="font-semibold">{ux.amberTitle}</p>
        )}
        <p className={isUx ? 'mt-1' : ''}>{explanation.alertBanner}</p>
        {isUx && (
          <p className="mt-1 text-xs font-normal text-amber-900/80">{ux.amberBody}</p>
        )}
        {activeSection === 'dashboard' && !isUx && (
          <p className="mt-1 text-xs font-normal text-amber-900/80">{b.eventBannerHint}</p>
        )}
      </div>
      {isUx && (
        <button
          type="button"
          onClick={() => setActiveSection('scheduling')}
          className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-xs font-semibold text-white hover:bg-brand-green-dark"
        >
          {ux.goSchedule}
        </button>
      )}
    </div>
  );

  const calmBanner = isUx && !eventPendingReview && activeSection === 'dashboard' && (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-brand-green/25 bg-brand-green/5 px-4 py-3 text-brand-green-dark">
      <span className="text-brand-green">✓</span>
      <div>
        <p className="font-semibold">{ux.calmTitle}</p>
        <p className="text-sm">{ux.calmBody}</p>
        <p className="text-sm opacity-80">{ux.calmMeta}</p>
      </div>
    </div>
  );

  const approvedStrip =
    isUx &&
    (accepted || planAcknowledged) &&
    !eventPendingReview &&
    (activeSection === 'dashboard' || activeSection === 'scheduling') && (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-brand-green/25 bg-brand-green/5 px-4 py-3 text-sm text-brand-green-dark">
        <span>✓</span>
        {ux.approvedStrip}
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
            {isUx && (
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-brand-green"
                  aria-label={ux.selectAll}
                  checked={allShownSelected}
                  onChange={toggleSelectAllShown}
                />
              </th>
            )}
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
            {isUx && (
              <th
                className={`px-4 py-3 ${hi.has('reason') ? 'bg-brand-green/10 ring-1 ring-inset ring-brand-green/30' : ''}`}
              >
                {copy.table.reason}
              </th>
            )}
            {!isUx && <th className="w-10 px-2 py-3" aria-label={b.actionsAria} />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {displayQueue.length === 0 && isUx && (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                {ux.noRows}
              </td>
            </tr>
          )}
          {displayQueue.map((row) => {
            const sp = speciesDisplay(row.species, locale);
            const isComplete = row.status === 'COMPLETE';
            const isHold = row.status === 'HOLD';
            const linePosition = queue.findIndex((r) => r.po === row.po) + 1;
            const isSelected = selectedPo.includes(row.po);
            return (
              <tr
                key={row.po}
                className={`hover:bg-gray-50/80 ${isSelected && isUx ? 'bg-brand-green/5' : ''} ${row.previousPosition && isUx ? 'ring-1 ring-inset ring-brand-green/20' : ''}`}
              >
                {isUx && (
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 accent-brand-green"
                      aria-label={ux.selectRow.replace('{po}', row.po)}
                      checked={isSelected}
                      onChange={() => togglePo(row.po)}
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">
                    {linePosition}
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
                      isHold
                        ? 'bg-red-50 text-red-900'
                        : isComplete
                          ? 'bg-brand-green/10 text-brand-green-dark'
                          : row.atRisk
                            ? 'bg-amber-50 text-amber-900'
                            : 'bg-brand-green/10 text-brand-green-dark'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isHold
                          ? 'bg-red-500'
                          : isComplete
                            ? 'bg-brand-green/60'
                            : row.atRisk
                              ? 'bg-amber-500'
                              : 'bg-brand-green'
                      }`}
                    />
                    {isHold
                      ? copy.statusLabels.hold
                      : isComplete
                        ? copy.statusLabels.complete
                        : row.atRisk
                          ? copy.statusLabels.atRisk
                          : copy.statusLabels.planned}
                  </span>
                </td>
                {isUx && (
                  <td
                    className={`max-w-[12rem] px-4 py-3 text-xs leading-snug text-gray-600 ${hi.has('reason') ? 'bg-brand-green/5' : ''}`}
                  >
                    {row.reasonShort ?? '—'}
                  </td>
                )}
                {!isUx && <td className="px-2 py-3 text-center text-gray-400">⋯</td>}
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
            {calmBanner}
            {eventBanner}
            {approvedStrip}
            {metricsGrid}
            {!eventPendingReview && (
              <p className="mt-4 text-sm text-gray-600">
                {isUx ? ux.whereNext : copy.copilotIdle}{' '}
                {showProgramTimeline && !isUx && `(${b.nav.queue} → ${b.nav.scheduling})`}
              </p>
            )}
            {isUx && !eventPendingReview && (
              <p className="mt-2 text-sm text-gray-500">
                {accepted || planAcknowledged ? ux.nextApproved : ux.nextCalm}
              </p>
            )}
          </>
        );
      case 'queue':
        return (
          <>
            {eventBanner}
            {approvedStrip}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-500">
                {eventPendingReview
                  ? b.queueSubtitleEvent
                  : isUx && (accepted || planAcknowledged)
                    ? ux.queueSubAfter
                    : b.queueSubtitle}
              </p>
              {isUx ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor="queue-filter">
                    {ux.filterLabel}
                  </label>
                  <select
                    id="queue-filter"
                    value={queueFilter}
                    onChange={(e) => setQueueFilter(e.target.value as PlantQueueFilter)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700"
                  >
                    <option value="all">{ux.fAll}</option>
                    <option value="risk">{ux.fRisk}</option>
                    <option value="hold">{ux.fHold}</option>
                    <option value="SWCO">{ux.fSwco}</option>
                    <option value="CORN">{ux.fCorn}</option>
                  </select>
                  {queueFilter !== 'all' && (
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-green hover:text-brand-green-dark"
                      onClick={() => setQueueFilter('all')}
                    >
                      {ux.clearFilter}
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {b.sortFilter}
                </button>
              )}
            </div>
            {isUx && selectedPo.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-brand-green/20 bg-brand-green/5 px-4 py-2.5 text-sm">
                <span className="font-medium text-brand-green-dark">
                  {ux.nSelected.replace('{n}', String(selectedPo.length))}
                </span>
                <button
                  type="button"
                  className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-dark"
                  onClick={() => setCompareOpen(true)}
                >
                  {ux.compare}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  onClick={() => setSelectedPo([])}
                >
                  {ux.clearSel}
                </button>
              </div>
            )}
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
            {isUx && eventPendingReview && explanation && (
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-900">{ux.whatChanged}</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                  {explanation.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            )}
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
            {isUx && (
              <>
                <button
                  type="button"
                  onClick={() => setHelpOpen(true)}
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                >
                  <span aria-hidden>?</span>
                  {ux.navHelp}
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-600 hover:bg-gray-50"
                >
                  <span>{ux.menuHistory}</span>
                  {uxApprovalHistory.length > 0 && (
                    <span className="rounded-full bg-brand-blue/10 px-1.5 text-[11px] font-semibold text-brand-blue">
                      {uxApprovalHistory.length}
                    </span>
                  )}
                </button>
              </>
            )}
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
                      className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left text-sm shadow-lg"
                    >
                      {isUx && (
                        <li className="border-b px-3 py-2 text-xs font-semibold text-gray-700">
                          {ux.notifTitle} ({notificationCount})
                        </li>
                      )}
                      {showSchedulingNotification && (
                        <li role="none" className="border-b px-3 py-3 last:border-0">
                          <div className="flex gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{ux.reviewUpdated}</p>
                              <p className="mt-0.5 text-xs text-gray-600">
                                {eventType === 'qa_fail' ? ux.qBell : ux.pBell}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-dark"
                                  onClick={() => goToSection('scheduling')}
                                >
                                  {ux.openSchedule}
                                </button>
                                {isUx && (
                                  <button
                                    type="button"
                                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                    onClick={() => setNotificationDismissed(true)}
                                  >
                                    {ux.dismiss}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      )}
                      {!isUx && schedulingActionPending && (
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
                      {queueUpdateUnread && isUx && (
                        <li role="none" className="px-3 py-3">
                          <div className="flex gap-2">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full border-2 border-brand-blue bg-transparent" aria-hidden />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{ux.confirmTitle}</p>
                              <p className="mt-0.5 text-xs text-gray-600">{ux.confirmBody}</p>
                              <button
                                type="button"
                                className="mt-2 rounded-lg bg-brand-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-dark"
                                onClick={() => goToSection('queue')}
                              >
                                {ux.openQueue}
                              </button>
                            </div>
                          </div>
                        </li>
                      )}
                      {queueUpdateUnread && !isUx && (
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
                    <div
                      id={bellMenuId}
                      className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-600 shadow-lg"
                    >
                      <p className="font-medium text-gray-900">{b.notificationsEmpty}</p>
                      {isUx && <p className="mt-1 text-xs text-gray-500">{ux.notifEmptySub}</p>}
                    </div>
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
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{sectionTitle()}</h3>
              {pill && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${pill.className}`}
                  title={pill.sub}
                >
                  <span className={`h-2 w-2 rounded-full ${pill.dot}`} />
                  {pill.label}
                </span>
              )}
            </div>
            <div className="mt-4">{renderMainSection()}</div>
          </section>
        </div>
      </div>

      {isUx && !compact && (
        <nav
          aria-label="Line 1 mobile"
          className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-4 border-t border-gray-200 bg-white lg:hidden"
        >
          {visibleNav.map((item) => {
            const badge = navBadgeKind(item.id);
            const selected = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
                  selected ? 'text-brand-green-dark' : 'text-gray-500'
                }`}
              >
                {b.nav[item.labelKey]}
                {badge && (
                  <span
                    className={`absolute right-[22%] top-2 h-2 w-2 rounded-full ${
                      badge === 'action' ? 'bg-amber-500' : 'bg-brand-blue'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      )}

      {isUx && eventPendingReview && onAccept && (
        <div className="fixed inset-x-0 bottom-14 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-0 lg:static lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 sm:max-w-none sm:justify-end">
            <p className="hidden flex-1 text-sm text-gray-600 sm:block">{ux.footerAction}</p>
            <button
              type="button"
              onClick={() => setActiveSection('copilot')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              {ux.askBtn}
            </button>
            <button
              type="button"
              disabled={acceptDisabled || accepted}
              onClick={onAccept}
              className="rounded-lg bg-brand-green px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-green-dark disabled:opacity-40"
            >
              ✓ {accepted ? copy.actions.accepted : copy.actions.accept}
            </button>
          </div>
        </div>
      )}

      {isUx && (
        <>
          <PlantHelpDrawer
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            locale={locale}
            copy={{
              title: ux.helpTitle,
              close: ux.helpClose,
              glossaryTitle: ux.glossaryTitle,
              journeysTitle: ux.journeysTitle,
              presenterTitle: ux.presenterTitle,
              glossary: ux.glossary,
              journeys: ux.journeys,
              talkTrack: ux.talkTrack,
            }}
          />
          <PlantUxHistoryDrawer
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            locale={locale}
            entries={uxApprovalHistory}
            copy={{
              title: ux.historyTitle,
              subtitle: ux.historySub,
              empty: ux.historyEmpty,
              close: ux.helpClose,
              priority: ux.histPriority,
              quality: ux.histQuality,
              byLine: ux.histBy,
            }}
          />
          <PlantUxCompareDrawer
            open={compareOpen}
            onClose={() => setCompareOpen(false)}
            locale={locale}
            queue={queue}
            selectedPo={selectedPo}
            formatFinish={(finish) => formatFinish(finish, locale, b.finishFormat)}
            copy={{
              title: ux.cmpTitle,
              subtitle: ux.cmpSub,
              close: ux.helpClose,
              totalWeight: ux.cmpTotal,
              crops: ux.cmpCrops,
              firstFinish: ux.cmpFirst,
              lastFinish: ux.cmpLast,
              holds: ux.cmpHolds,
              colPosition: ux.cmpPosition,
              colOrder: ux.colOrder,
              colWeight: ux.colWeight,
              colFinish: ux.colFinish,
              colStatus: ux.colStatus,
              paused: ux.paused,
              statusPlanned: copy.statusLabels.planned,
              statusAtRisk: copy.statusLabels.atRisk,
              statusComplete: copy.statusLabels.complete,
              statusHold: copy.statusLabels.hold,
            }}
          />
        </>
      )}
    </div>
  );
}
