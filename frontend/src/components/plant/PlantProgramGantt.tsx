import { useEffect, useState, type ReactNode } from 'react';
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
  lineId?: string;
};

/** Viewport for Gantt rows — scroll instead of paginating (keeps timeline context). */
const GANTT_SCROLL_MAX_CLASS = 'max-h-[min(28rem,58vh)]';
const DAY_MS = 24 * 60 * 60 * 1000;

function parseFinish(finish: string): number | null {
  const match = finish.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatDay(ms: number, locale: Locale) {
  return new Date(ms).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function dateScale(rows: QueueRow[]) {
  const times = rows
    .map((row) => parseFinish(row.finish))
    .filter((value): value is number => value != null);
  if (!times.length) return null;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const span = Math.max(max - min, DAY_MS);
  const start = min - span * 0.06;
  const end = max + span * 0.06;
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const ratio = index / (tickCount - 1);
    return { pct: ratio * 100, at: start + (end - start) * ratio };
  });
  return { start, end, ticks };
}

function moveNote(
  row: QueueRow,
  index: number,
  labels: { movedUp: string; movedDown: string; heldWas: string },
): string | null {
  const previous = row.previousPosition;
  const current = index + 1;
  if (previous == null || previous === current) return null;
  const text =
    row.status === 'HOLD' ? labels.heldWas : previous > current ? labels.movedUp : labels.movedDown;
  return text.replace('{n}', String(previous));
}

function lineNumber(lineId?: string) {
  return String(lineId ?? 'line-1').match(/(\d+)\s*$/)?.[1] ?? '1';
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

function buildApproval(rows: QueueRow[]) {
  const indexed = rows.map((row, index) => ({ row, index }));
  const held = indexed.filter((item) => item.row.status === 'HOLD');
  const runnable = indexed.filter(
    (item) => item.row.status !== 'HOLD' && parseFinish(item.row.finish) != null,
  );
  const times = runnable.map((item) => parseFinish(item.row.finish) as number);
  const startDay = times.length ? Math.min(...times) : Date.UTC(2026, 8, 29);
  const endDay = times.length ? Math.max(...times) : startDay;
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
      const kind = previous != null && previous > current ? 'up' : 'quiet';
      const left = ((at - startDay) / span) * 100;
      return { ...item, at, lane, kind, left: Math.min(Math.max(left, 0), 92) };
    });
  return { days, held, placed, laneCount: Math.max(lanes.length, 1) };
}

function barPlacement(finish: string, scale: NonNullable<ReturnType<typeof dateScale>>) {
  const at = parseFinish(finish);
  if (at == null) return { left: 2, width: 16 };
  const oneDay = (DAY_MS / (scale.end - scale.start)) * 100;
  const width = Math.min(22, Math.max(10, oneDay * 1.6));
  const center = ((at - scale.start) / (scale.end - scale.start)) * 100;
  const left = Math.min(Math.max(center - width / 2, 0), 100 - width);
  return { left, width };
}

export function PlantProgramGantt({
  rows,
  rushPo,
  compact,
  layout = 'vertical',
  onLayoutChange,
  lineId,
}: PlantProgramGanttProps) {
  const { locale, messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const [expanded, setExpanded] = useState(false);
  const scale = dateScale(rows);
  const lineNo = lineNumber(lineId);

  useEffect(() => {
    if (!expanded) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setExpanded(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);
  const footer = s.footerTotal
    .replace('{count}', String(rows.length))
    .replace('{runtime}', s.demoRuntime);

  function renderRowMeta(row: QueueRow, index: number, isRush: boolean, isHold: boolean) {
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
          {row.reasonShort ? `${row.species} · ${row.kg} kg` : meta.productCode}
        </p>
        <p className="mt-0.5 text-[9px] leading-snug text-gray-600">
          {row.reasonShort ?? `${row.species === 'CORN' ? '🌽' : '🌿'} ${meta.client}`}
        </p>
      </>
    );
  }

  function barTone(row: QueueRow, index: number): 'hold' | 'up' | 'quiet' {
    if (row.status === 'HOLD') return 'hold';
    const previous = row.previousPosition;
    if (previous != null && previous > index + 1) return 'up';
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
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            {layout === 'approval' ? s.approvalTitle.replace('{line}', lineNo) : s.ganttTitle}
            <span className="font-normal text-gray-400" title={s.ganttHint}>
              ⓘ
            </span>
          </h3>
          {layout === 'approval' && (
            <p className="text-xs text-gray-500">{s.approvalSubtitle}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
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
          {layout !== 'approval' && (
            <>
              <span className="rounded border border-gray-200 px-2 py-0.5">{s.zoom1h}</span>
              <ToolbarBtn label="Zoom in">+</ToolbarBtn>
              <ToolbarBtn label="Zoom out">−</ToolbarBtn>
            </>
          )}
          <ToolbarBtn
            label={expanded ? s.closeExpanded : s.expand}
            pressed={expanded}
            onClick={() => setExpanded((open) => !open)}
          >
            ⤢
          </ToolbarBtn>
        </div>
      </div>

      {layout === 'vertical' ? (
        <div
          className={scrollClass}
          tabIndex={0}
          role="region"
          aria-label={s.ganttScrollRegionVertical}
        >
          <div className="min-w-[640px]">
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
                    {formatDay(tick.at, locale)}
                  </span>
                ))}
              </div>
            </div>

            <ul className="space-y-0 divide-y divide-gray-100 border-y border-gray-100">
              {rows.map((row, index) => {
                const isRush = row.po === rushPo;
                const isHold = row.status === 'HOLD';
                const tone = barTone(row, index);
                const place = scale ? barPlacement(row.finish, scale) : { left: 2, width: 16 };
                const color = toneTrack(tone);
                const note = moveNote(row, index, s);
                const noteOnLeft = place.left + place.width > 58;

                return (
                  <li
                    key={row.po}
                    className={`grid grid-cols-[14rem_1fr] items-center gap-2 py-2 ${
                      isHold
                        ? 'bg-red-50/80 ring-1 ring-inset ring-red-200'
                        : isRush
                          ? 'bg-orange-50/80 ring-1 ring-inset ring-orange-300'
                          : ''
                    }`}
                  >
                    <div className="px-1" title={s.queuePosition.replace('{n}', String(index + 1))}>
                      {renderRowMeta(row, index, isRush, isHold)}
                    </div>
                    <div className="relative h-11 rounded bg-gray-50/80">
                      <div
                        className={`absolute top-1.5 flex h-8 items-center rounded px-2 text-[10px] font-medium shadow ${color}`}
                        style={{ left: `${place.left}%`, width: `${place.width}%` }}
                        title={isHold ? s.holdShort : row.finish}
                      >
                        {isRush && !isHold && <span className="mr-1">✦</span>}
                        {isHold
                          ? s.holdShort
                          : parseFinish(row.finish) != null
                            ? formatDay(parseFinish(row.finish) as number, locale)
                            : row.finish}
                      </div>
                      {note && (
                        <span
                          className="absolute top-1.5 flex h-8 items-center whitespace-nowrap rounded-md border border-dashed border-gray-300 bg-white/90 px-2 text-[10px] font-medium text-gray-600"
                          style={
                            noteOnLeft
                              ? { right: `calc(${100 - place.left}% + 8px)` }
                              : { left: `calc(${place.left + place.width}% + 8px)` }
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
              const note = moveNote(row, index, s);

              return (
                <article
                  key={row.po}
                  className={`flex min-h-[7.5rem] flex-col rounded-xl border p-3 shadow-sm ${
                    tone === 'hold'
                      ? 'border-red-200 bg-red-50 ring-2 ring-red-300'
                      : tone === 'up'
                        ? 'border-green-200 bg-white'
                        : 'border-indigo-100 bg-indigo-50'
                  }`}
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
}: {
  rows: QueueRow[];
  locale: Locale;
  labels: ApprovalLabels;
  className: string;
}) {
  const model = buildApproval(rows);
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
                className={`truncate rounded-lg px-2.5 py-2 text-[11px] font-semibold shadow-sm ${
                  bar.kind === 'up'
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
                  className="rounded-md border border-red-200 px-2 py-1.5 text-[11px] font-semibold text-red-800"
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
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
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
  onClick,
}: {
  children: ReactNode;
  label: string;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded border border-gray-200 px-1.5 py-0.5 hover:bg-gray-50 ${
        pressed ? 'bg-brand-green text-white' : ''
      }`}
    >
      {children}
    </button>
  );
}
