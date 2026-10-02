import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { PLANT_SCHEDULE_META } from '../../demo/plant/plantScheduleMeta';
import { useLocale } from '../../i18n';
import type { Locale } from '../../i18n/LocaleContext';

export type ScheduleGanttLayout = 'vertical' | 'horizontal' | 'approval';

type PlantProgramGanttProps = {
  rows: QueueRow[];
  rushPo?: string;
  compact?: boolean;
  layout?: ScheduleGanttLayout;
  onLayoutChange?: (layout: ScheduleGanttLayout) => void;
  /** Move callouts belong to a plan still waiting for acceptance. */
  showMoves?: boolean;
  /** When set, the parent owns the expanded-timeline dialog. */
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
  /** Reorder a runnable row while the expanded timeline is open. Index 0 stays put. */
  onMoveRow?: (index: number, direction: -1 | 1) => void;
  /** Drop a runnable row on another runnable position. Index 0 stays put. */
  onPlaceRow?: (from: number, to: number) => void;
  /** Order explained in the copilot beside this timeline. */
  selectedPo?: string;
  /** Choose an order for the copilot. Does not leave the schedule. */
  onSelectRow?: (po: string) => void;
};

/** Viewport for Gantt rows — scroll instead of paginating (keeps timeline context). */
const GANTT_SCROLL_MAX_CLASS = 'max-h-[min(28rem,58vh)]';
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const ZOOM_STEPS = [
  { label: '1W', ms: 7 * DAY_MS },
  { label: '1D', ms: DAY_MS },
  { label: '6H', ms: 6 * HOUR_MS },
  { label: '1H', ms: HOUR_MS },
] as const;

function parseFinish(finish: string): number | null {
  const match = finish.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  const hour = match[4] != null ? Number(match[4]) : 12;
  const minute = match[5] != null ? Number(match[5]) : 0;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), hour, minute);
}

function formatDay(ms: number, locale: Locale) {
  return new Date(ms).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function dateScale(rows: QueueRow[], stepMs: number) {
  const times = rows
    .map((row) => parseFinish(row.finish))
    .filter((value): value is number => value != null);
  if (!times.length) return null;
  const start = Math.floor(Math.min(...times) / stepMs) * stepMs;
  const end = Math.max(Math.ceil(Math.max(...times) / stepMs) * stepMs, start + stepMs);
  const ticks: { pct: number; at: number }[] = [];
  for (let at = start; at <= end; at += stepMs) {
    ticks.push({ at, pct: ((at - start) / (end - start)) * 100 });
  }
  return { start, end, ticks, stepMs };
}

function formatTick(ms: number, stepMs: number, locale: Locale) {
  if (stepMs >= DAY_MS) return formatDay(ms, locale);
  const date = new Date(ms);
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0) return formatDay(ms, locale);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatBarWhen(finish: string, stepMs: number, locale: Locale) {
  const at = parseFinish(finish);
  if (at == null) return finish;
  if (stepMs >= DAY_MS) return formatDay(at, locale);
  const date = new Date(at);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${formatDay(at, locale)} ${hh}:${mm}`;
}

function moveNote(
  row: QueueRow,
  index: number,
  labels: { movedUp: string; movedDown: string; heldWas: string },
): string | null {
  const previous = row.previousPosition;
  const current = index + 1;
  if (previous == null || previous === current) return null;
  if (row.status === 'HOLD') return labels.heldWas.replace('{n}', String(previous));
  if (previous > current) return labels.movedUp.replace('{n}', String(previous));
  return labels.movedDown.replace('{n}', String(previous));
}

function weekdayTick(ms: number, locale: Locale) {
  const date = new Date(ms);
  const name = date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    weekday: 'short',
    timeZone: 'UTC',
  });
  return `${name.replace('.', '')} ${date.getUTCDate()}`;
}

type ApprovalLabels = {
  holdArea: string;
  movedUpShort: string;
  legendMovedUp: string;
  legendHold: string;
  legendUnchanged: string;
  holdShort: string;
};

function buildApproval(rows: QueueRow[], showMoves: boolean) {
  const indexed = rows.map((row, index) => ({ row, index }));
  const held = indexed.filter((item) => item.row.status === 'HOLD');
  const runnable = indexed.filter(
    (item) => item.row.status !== 'HOLD' && parseFinish(item.row.finish) != null,
  );
  const times = runnable.map((item) => parseFinish(item.row.finish) as number);
  const startDay = times.length
    ? Date.UTC(
        new Date(Math.min(...times)).getUTCFullYear(),
        new Date(Math.min(...times)).getUTCMonth(),
        new Date(Math.min(...times)).getUTCDate(),
      )
    : Date.UTC(2026, 8, 29);
  const endStamp = times.length ? Math.max(...times) : startDay;
  const endDay = Date.UTC(
    new Date(endStamp).getUTCFullYear(),
    new Date(endStamp).getUTCMonth(),
    new Date(endStamp).getUTCDate(),
  );
  const dayCount = Math.max(1, Math.round((endDay - startDay) / DAY_MS) + 1);
  const days = Array.from({ length: dayCount }, (_, index) => startDay + index * DAY_MS);
  const span = dayCount * DAY_MS;
  const barDays = 1.5;
  const lanes: number[] = [];
  const placed = [...runnable]
    .sort((a, b) => (parseFinish(a.row.finish) as number) - (parseFinish(b.row.finish) as number))
    .map((item) => {
      const at = parseFinish(item.row.finish) as number;
      const start = at - barDays * DAY_MS * 0.45;
      const end = at + barDays * DAY_MS * 0.55;
      let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
      if (lane < 0) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      const previous = item.row.previousPosition;
      const current = item.index + 1;
      const kind = showMoves && previous != null && previous > current ? 'up' : 'quiet';
      const left = ((at - startDay) / span) * 100;
      return { ...item, at, lane, kind, left: Math.min(Math.max(left, 0), 92) };
    });
  return { days, held, placed, laneCount: Math.max(lanes.length, 1) };
}

function barPlacement(finish: string, scale: NonNullable<ReturnType<typeof dateScale>>) {
  const at = parseFinish(finish);
  if (at == null) return { left: 2, width: 16 };
  const span = scale.end - scale.start;
  const width = Math.min(28, Math.max(3.5, (scale.stepMs / span) * 100 * 0.9));
  const center = ((at - scale.start) / span) * 100;
  const left = Math.min(Math.max(center - width / 2, 0), 100 - width);
  return { left, width };
}

export function PlantProgramGantt({
  rows,
  rushPo,
  compact,
  layout = 'vertical',
  onLayoutChange,
  showMoves = true,
  expanded: expandedProp,
  onExpandedChange,
  onMoveRow,
  onPlaceRow,
  selectedPo,
  onSelectRow,
}: PlantProgramGanttProps) {
  const { locale, messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;
  function setExpanded(next: boolean) {
    if (expandedProp === undefined) setExpandedInternal(next);
    onExpandedChange?.(next);
  }
  const [zoomIndex, setZoomIndex] = useState(1);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const dragRef = useRef<{ from: number; over: number } | null>(null);
  const listRef = useRef<HTMLElement | null>(null);
  const zoom = ZOOM_STEPS[zoomIndex];
  const scale = dateScale(rows, zoom.ms);
  const tickPx = zoom.ms <= HOUR_MS ? 44 : zoom.ms <= 6 * HOUR_MS ? 56 : 72;
  const chartMinPx = Math.max(640, (scale?.ticks.length ?? 1) * tickPx);

  useEffect(() => {
    if (!expanded) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  function canDragRow(index: number) {
    if (layout === 'approval') return false;
    const row = rows[index];
    return Boolean(onPlaceRow && row && row.status !== 'HOLD' && index > 0);
  }

  function onDragPointerDown(index: number, event: ReactPointerEvent<HTMLElement>) {
    if (!canDragRow(index)) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    const session = { from: index, over: index };
    dragRef.current = session;
    setDrag(session);

    function move(pointer: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;
      const scroller = listRef.current?.parentElement;
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        if (pointer.clientY < box.top + 28) scroller.scrollTop -= 14;
        else if (pointer.clientY > box.bottom - 28) scroller.scrollTop += 14;
      }
      const hit = document.elementFromPoint(pointer.clientX, pointer.clientY);
      const item = hit?.closest<HTMLElement>('[data-queue-index]');
      const over = Number(item?.dataset.queueIndex);
      if (!canDragRow(over) || current.over === over) return;
      const next = { ...current, over };
      dragRef.current = next;
      setDrag(next);
    }

    function finish() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      const current = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (current && current.from !== current.over) onPlaceRow?.(current.from, current.over);
      const po = current ? rows[current.from]?.po : undefined;
      if (po) onSelectRow?.(po);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  }

  function dragClass(index: number) {
    if (!drag) return '';
    if (drag.from === index) return 'opacity-40';
    if (drag.over === index) return 'ring-2 ring-inset ring-brand-green';
    return '';
  }

  function rowRing(po: string, isHold: boolean, isRush: boolean) {
    if (drag) return '';
    if (onSelectRow && selectedPo === po) return 'ring-2 ring-inset ring-brand-green';
    if (isHold) return 'ring-1 ring-inset ring-red-200';
    if (isRush) return 'ring-1 ring-inset ring-orange-300';
    return '';
  }

  function selectRowFromClick(index: number, po: string, event: { target: EventTarget | null }) {
    if (!onSelectRow || canDragRow(index)) return;
    if ((event.target as HTMLElement).closest('button')) return;
    onSelectRow(po);
  }

  function selectRowFromKey(po: string, event: { key: string; preventDefault: () => void; target: EventTarget | null }) {
    if (!onSelectRow) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    onSelectRow(po);
  }
  const footer = s.footerTotal
    .replace('{count}', String(rows.length))
    .replace('{runtime}', s.demoRuntime);

  function renderRowMeta(row: QueueRow, index: number, isRush: boolean, isHold: boolean) {
    const previous = row.previousPosition;
    const moved = previous != null && previous !== index + 1;
    const reason = showMoves || isHold || !moved ? row.reasonShort : undefined;
    const meta = PLANT_SCHEDULE_META[row.po] ?? {
      client: 'Demo customer',
      productCode: `${row.species} batch`,
      priority: 3 as const,
    };
    return (
      <>
        <p className="font-mono text-[11px] font-semibold text-gray-900">
          <span className="mr-1 text-gray-400">{index + 1}.</span>
          PO {row.po}
          {isHold ? (
            <span className="ml-1 rounded bg-red-700 px-1 text-[9px] font-bold text-white">{s.holdShort}</span>
          ) : (
            isRush && (
              <span className="ml-1 rounded bg-orange-500 px-1 text-[9px] font-bold text-white">{s.urgent}</span>
            )
          )}
        </p>
        <p className="text-[10px] text-gray-500">
          {reason ? `${row.species} · ${row.kg} kg` : meta.productCode}
        </p>
        <p className="mt-0.5 text-[9px] leading-snug text-gray-600">
          {reason ?? `${row.species === 'CORN' ? '🌽' : '🌿'} ${meta.client}`}
        </p>
      </>
    );
  }

  function barTone(row: QueueRow, index: number): 'hold' | 'up' | 'quiet' {
    if (row.status === 'HOLD') return 'hold';
    const previous = row.previousPosition;
    if (showMoves && previous != null && previous > index + 1) return 'up';
    return 'quiet';
  }

  function toneTrack(tone: 'hold' | 'up' | 'quiet') {
    if (tone === 'hold') return 'bg-red-700 text-white ring-2 ring-red-800';
    if (tone === 'up') return 'bg-brand-green text-white';
    return 'bg-indigo-100 text-indigo-950 ring-1 ring-indigo-200';
  }

  function toneFill(tone: 'hold' | 'up' | 'quiet') {
    if (tone === 'hold') return 'bg-red-700';
    if (tone === 'up') return 'bg-brand-green';
    return 'bg-indigo-200';
  }

  const scrollClass = expanded ? 'min-h-0 flex-1 overflow-auto p-3' : `${GANTT_SCROLL_MAX_CLASS} overflow-auto p-2`;

  return (
    <>
    {expanded && (
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/40"
        aria-label={s.closeExpanded}
        onClick={() => setExpanded(false)}
      />
    )}
    <div
      className={
        expanded
          ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl'
          : `min-w-0 flex-1 bg-white ${compact ? '' : 'border-r border-gray-200'}`
      }
      role={expanded ? 'dialog' : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? s.ganttTitle : undefined}
    >
      <div className="space-y-3 border-b border-gray-100 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {s.ganttTitle}
            <TimelineInfo text={s.ganttHint} />
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            {onLayoutChange && (
              <div className="flex rounded-lg border border-gray-200 p-0.5" role="group" aria-label={s.layoutToggleAria}>
                <LayoutBtn
                  active={layout === 'vertical'}
                  label={s.layoutVertical}
                  onClick={() => onLayoutChange('vertical')}
                />
                <LayoutBtn
                  active={layout === 'horizontal'}
                  label={s.layoutHorizontal}
                  onClick={() => onLayoutChange('horizontal')}
                />
                <LayoutBtn
                  active={layout === 'approval'}
                  label={s.layoutApproval}
                  onClick={() => onLayoutChange('approval')}
                />
              </div>
            )}
            {layout === 'vertical' && (
              <div className="flex items-center gap-1">
                <span className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-700" title={s.zoomHint}>
                  {zoom.label}
                </span>
                <ToolbarBtn
                  label={s.zoomIn}
                  disabled={zoomIndex >= ZOOM_STEPS.length - 1}
                  onClick={() => setZoomIndex((index) => Math.min(ZOOM_STEPS.length - 1, index + 1))}
                >
                  +
                </ToolbarBtn>
                <ToolbarBtn
                  label={s.zoomOut}
                  disabled={zoomIndex <= 0}
                  onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
                >
                  −
                </ToolbarBtn>
              </div>
            )}
            <ToolbarBtn
              label={expanded ? s.closeExpanded : s.expand}
              pressed={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              ⤢
            </ToolbarBtn>
          </div>
        </div>
        {layout === 'approval' && (
          <p className="max-w-2xl text-xs leading-relaxed text-gray-500">{s.approvalSubtitle}</p>
        )}
        {onPlaceRow && layout !== 'approval' && (
          <p className="max-w-2xl text-xs leading-relaxed text-gray-500">{s.adjustHint}</p>
        )}
      </div>

      {layout === 'vertical' ? (
        <div
          className={scrollClass}
          tabIndex={0}
          role="region"
          aria-label={s.ganttScrollRegionVertical}
        >
          <div style={{ minWidth: chartMinPx }}>
            <div className="sticky top-0 z-10 mb-1 grid grid-cols-[14rem_1fr] gap-2 bg-white pb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
              <span />
              <div className="relative h-4">
                {scale?.ticks.map((tick) => (
                  <span
                    key={tick.at}
                    className="absolute top-0 whitespace-nowrap"
                    style={{
                      left: `${tick.pct}%`,
                      transform:
                        tick.pct < 8 ? 'none' : tick.pct > 92 ? 'translateX(-100%)' : 'translateX(-50%)',
                    }}
                  >
                    {formatTick(tick.at, zoom.ms, locale)}
                  </span>
                ))}
              </div>
            </div>

            <ul
              ref={(node) => {
                listRef.current = node;
              }}
              className="space-y-0 divide-y divide-gray-100 border-y border-gray-100"
            >
              {rows.map((row, index) => {
                const isRush = row.po === rushPo;
                const isHold = row.status === 'HOLD';
                const tone = barTone(row, index);
                const place = scale ? barPlacement(row.finish, scale) : { left: 2, width: 16 };
                const color = toneTrack(tone);
                const note = showMoves ? moveNote(row, index, s) : null;
                const barEnd = place.left + place.width;
                const roomRight = 100 - barEnd;
                const noteOnLeft = roomRight < 22;

                return (
                  <li
                    key={row.po}
                    data-queue-index={index}
                    onPointerDown={(event) => onDragPointerDown(index, event)}
                    onClick={(event) => selectRowFromClick(index, row.po, event)}
                    onKeyDown={(event) => selectRowFromKey(row.po, event)}
                    tabIndex={onSelectRow ? 0 : undefined}
                    aria-selected={onSelectRow ? selectedPo === row.po : undefined}
                    className={`grid grid-cols-[14rem_minmax(0,1fr)] items-center gap-2 py-2 ${
                      isHold ? 'bg-red-50/80' : isRush ? 'bg-orange-50/80' : ''
                    } ${rowRing(row.po, isHold, isRush)} ${canDragRow(index) ? 'cursor-grab active:cursor-grabbing' : onSelectRow ? 'cursor-pointer' : ''} ${dragClass(index)}`}
                  >
                    <div className="min-w-0 px-1" title={s.queuePosition.replace('{n}', String(index + 1))}>
                      {canDragRow(index) && (
                        <span className="mr-1 text-gray-400" aria-hidden="true" title={s.adjustDrag}>
                          ⋮⋮
                        </span>
                      )}
                      {renderRowMeta(row, index, isRush, isHold)}
                      <RowMoveControls
                        index={index}
                        row={row}
                        rows={rows}
                        onMoveRow={onMoveRow}
                        labels={s}
                      />
                    </div>
                    <div className="relative h-11 min-w-0">
                      <div
                        className={`absolute top-1.5 flex h-8 items-center rounded px-2 text-[10px] font-medium shadow ${color}`}
                        style={{ left: `${place.left}%`, width: `${place.width}%` }}
                        title={isHold ? s.holdShort : row.finish}
                      >
                        {isRush && !isHold && <span className="mr-1">✦</span>}
                        {isHold ? s.holdShort : formatBarWhen(row.finish, zoom.ms, locale)}
                      </div>
                      {note && (
                        <span
                          className="absolute top-1.5 flex h-8 items-center truncate whitespace-nowrap rounded-md border border-dashed border-gray-300 bg-white/90 px-2 text-[10px] font-medium text-gray-600"
                          style={
                            noteOnLeft
                              ? {
                                  right: `calc(${100 - place.left}% + 8px)`,
                                  maxWidth: `calc(${Math.max(place.left - 4, 12)}% - 8px)`,
                                }
                              : {
                                  left: `calc(${barEnd}% + 8px)`,
                                  maxWidth: `calc(${Math.max(roomRight - 2, 12)}% - 12px)`,
                                }
                          }
                        >
                          {note}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : layout === 'horizontal' ? (
        <div
          ref={(node) => {
            listRef.current = node;
          }}
          className={expanded ? 'min-h-0 flex-1 overflow-auto p-4' : `${GANTT_SCROLL_MAX_CLASS} overflow-x-auto overflow-y-auto p-3`}
          tabIndex={0}
          role="region"
          aria-label={s.ganttScrollRegionHorizontal}
        >
          <div className="grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-3">
            {rows.map((row, index) => {
              const isRush = row.po === rushPo;
              const isHold = row.status === 'HOLD';
              const tone = barTone(row, index);
              const note = showMoves ? moveNote(row, index, s) : null;

              return (
                <article
                  key={row.po}
                  data-queue-index={index}
                  onPointerDown={(event) => onDragPointerDown(index, event)}
                  onClick={(event) => selectRowFromClick(index, row.po, event)}
                  onKeyDown={(event) => selectRowFromKey(row.po, event)}
                  tabIndex={onSelectRow ? 0 : undefined}
                  aria-selected={onSelectRow ? selectedPo === row.po : undefined}
                  className={`flex min-h-[7.5rem] flex-col rounded-xl border p-3 shadow-sm ${
                    tone === 'hold'
                      ? 'border-red-200 bg-red-50'
                      : tone === 'up'
                        ? 'border-green-200 bg-white'
                        : 'border-indigo-100 bg-indigo-50'
                  } ${rowRing(row.po, isHold, isRush)} ${canDragRow(index) ? 'cursor-grab active:cursor-grabbing' : onSelectRow ? 'cursor-pointer' : ''} ${dragClass(index)}`}
                >
                  <span className={`mb-2 h-1.5 w-10 rounded-full ${toneFill(tone)}`} />
                  {renderRowMeta(row, index, isRush, isHold)}
                  <p className="mt-auto pt-2 text-[11px] font-medium text-gray-700">
                    {isHold ? s.holdShort : row.finish}
                  </p>
                  {note && (
                    <p className="mt-1 rounded-md border border-dashed border-gray-300 bg-white/80 px-2 py-1 text-[11px] leading-snug text-gray-700">
                      {note}
                    </p>
                  )}
                  <RowMoveControls
                    index={index}
                    row={row}
                    rows={rows}
                    onMoveRow={onMoveRow}
                    labels={s}
                  />
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <ApprovalTimeline
          rows={rows}
          locale={locale}
          labels={s}
          showMoves={showMoves}
          selectedPo={selectedPo}
          onSelectRow={onSelectRow}
          className={
            expanded ? 'min-h-0 flex-1 overflow-auto p-3' : `${GANTT_SCROLL_MAX_CLASS} overflow-auto p-3`
          }
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500">
        <span>{footer}</span>
        {layout !== 'approval' && <ColorLegend labels={s} />}
        {rows.length > 8 && <span className="text-gray-400">{s.ganttScrollHint}</span>}
      </div>
    </div>
    </>
  );
}

function ApprovalTimeline({
  rows,
  locale,
  labels,
  className,
  showMoves,
  selectedPo,
  onSelectRow,
}: {
  rows: QueueRow[];
  locale: Locale;
  labels: ApprovalLabels;
  className: string;
  showMoves: boolean;
  selectedPo?: string;
  onSelectRow?: (po: string) => void;
}) {
  const model = buildApproval(rows, showMoves);
  const dayWidth = 4.75;
  return (
    <div className={className} role="region" aria-label={labels.holdArea}>
      <div className="px-3 pb-2" style={{ minWidth: `${model.days.length * dayWidth}rem` }}>
        <div
          className="grid border-b border-gray-200 text-[10px] font-medium uppercase tracking-wide text-gray-400"
          style={{ gridTemplateColumns: `repeat(${model.days.length}, minmax(0, 1fr))` }}
        >
          {model.days.map((day) => (
            <div key={day} className="border-l border-gray-100 px-1 py-1.5">
              {weekdayTick(day, locale)}
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: model.laneCount * 52 + 12 }}>
          {model.placed.map((bar) => (
            <div
              key={bar.row.po}
              className="absolute flex max-w-[16rem] items-center"
              style={{ top: 8 + bar.lane * 52, left: `${bar.left}%` }}
            >
              <div
                role={onSelectRow ? 'button' : undefined}
                tabIndex={onSelectRow ? 0 : undefined}
                aria-pressed={onSelectRow ? selectedPo === bar.row.po : undefined}
                onClick={() => onSelectRow?.(bar.row.po)}
                onKeyDown={(event) => {
                  if (!onSelectRow) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  onSelectRow(bar.row.po);
                }}
                className={`truncate rounded-lg px-2.5 py-2 text-[11px] font-semibold shadow-sm ${
                  onSelectRow ? 'cursor-pointer' : ''
                } ${
                  selectedPo === bar.row.po
                    ? 'bg-brand-green text-white ring-2 ring-brand-green-dark'
                    : bar.kind === 'up'
                      ? 'bg-brand-green text-white ring-2 ring-green-800'
                      : 'bg-indigo-100 text-indigo-950'
                }`}
                title={bar.row.reasonShort ?? bar.row.finish}
              >
                {bar.row.po} · {bar.row.species}
              </div>
              {bar.kind === 'up' && (
                <span className="ml-1 shrink-0 rounded-md border border-dashed border-green-600 bg-white px-1.5 py-1 text-[10px] font-medium text-green-700">
                  {labels.movedUpShort}
                </span>
              )}
            </div>
          ))}
        </div>
        {model.held.length > 0 && (
          <div className="mt-2 rounded-lg border border-dashed border-red-300 bg-red-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-red-700">{labels.holdArea}</p>
            <ul className="mt-2 space-y-2">
              {model.held.map(({ row }) => (
                <li
                  key={row.po}
                  role={onSelectRow ? 'button' : undefined}
                  tabIndex={onSelectRow ? 0 : undefined}
                  aria-pressed={onSelectRow ? selectedPo === row.po : undefined}
                  onClick={() => onSelectRow?.(row.po)}
                  onKeyDown={(event) => {
                    if (!onSelectRow) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    onSelectRow(row.po);
                  }}
                  className={`rounded-md border px-2 py-1.5 text-[11px] font-semibold text-red-800 ${
                    onSelectRow ? 'cursor-pointer' : ''
                  } ${selectedPo === row.po ? 'border-brand-green ring-2 ring-brand-green' : 'border-red-200'}`}
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(-45deg, rgba(254,226,226,0.95), rgba(254,226,226,0.95) 6px, rgba(252,165,165,0.55) 6px, rgba(252,165,165,0.55) 8px)',
                  }}
                  title={row.reasonShort}
                >
                  {row.po} · {row.species} · {labels.holdShort}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ColorLegend labels={labels} className="mt-3" />
      </div>
    </div>
  );
}

function ColorLegend({ labels, className = '' }: { labels: ApprovalLabels; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-4 text-[11px] text-gray-600 ${className}`}>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-brand-green" />
        {labels.legendMovedUp}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-red-600" />
        {labels.legendHold}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-indigo-200" />
        {labels.legendUnchanged}
      </span>
    </div>
  );
}

function rowCanMove(rows: QueueRow[], index: number, direction: -1 | 1): boolean {
  const row = rows[index];
  if (!row || row.status === 'HOLD' || index <= 0) return false;
  const target = index + direction;
  if (target <= 0 || target >= rows.length) return false;
  return rows[target].status !== 'HOLD';
}

function RowMoveControls({
  index,
  row,
  rows,
  onMoveRow,
  labels,
}: {
  index: number;
  row: QueueRow;
  rows: QueueRow[];
  onMoveRow?: (index: number, direction: -1 | 1) => void;
  labels: { adjustUp: string; adjustDown: string; adjustRunning: string };
}) {
  if (!onMoveRow || row.status === 'HOLD') return null;
  if (index === 0) {
    return (
      <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {labels.adjustRunning}
      </span>
    );
  }
  return (
    <span className="mt-1 flex gap-1">
      <button
        type="button"
        aria-label={labels.adjustUp}
        disabled={!rowCanMove(rows, index, -1)}
        onClick={() => onMoveRow(index, -1)}
        className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label={labels.adjustDown}
        disabled={!rowCanMove(rows, index, 1)}
        onClick={() => onMoveRow(index, 1)}
        className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
      >
        ↓
      </button>
    </span>
  );
}

function TimelineInfo({ text }: { text: string }) {
  const tipId = useId();
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-semibold leading-none text-brand-blue shadow-sm transition hover:border-brand-blue hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
      >
        i
        <span className="sr-only">{text}</span>
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 w-64 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-normal leading-relaxed text-gray-600 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

function LayoutBtn({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
        active ? 'bg-brand-green text-white' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

function ToolbarBtn({
  children,
  label,
  pressed,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`rounded border border-gray-200 px-2 py-1 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 ${
        pressed ? 'bg-brand-green text-white' : ''
      }`}
    >
      {children}
    </button>
  );
}
