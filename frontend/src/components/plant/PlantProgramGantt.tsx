import { useEffect, useState, type ReactNode } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { PLANT_SCHEDULE_META } from '../../demo/plant/plantScheduleMeta';
import { useLocale } from '../../i18n';
import type { Locale } from '../../i18n/LocaleContext';

export type ScheduleGanttLayout = 'vertical' | 'horizontal';

type PlantProgramGanttProps = {
  rows: QueueRow[];
  rushPo?: string;
  compact?: boolean;
  layout?: ScheduleGanttLayout;
  onLayoutChange?: (layout: ScheduleGanttLayout) => void;
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
}: PlantProgramGanttProps) {
  const { locale, messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const [expanded, setExpanded] = useState(false);
  const scale = dateScale(rows);

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

  function renderRowMeta(row: QueueRow, index: number, isRush: boolean) {
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
          {isRush && (
            <span className="ml-1 rounded bg-orange-500 px-1 text-[9px] font-bold text-white">{s.urgent}</span>
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

  function barTrackClass(row: QueueRow, isRush: boolean, isHold: boolean) {
    if (isRush) return 'bg-orange-400 ring-2 ring-orange-500';
    if (isHold) return 'bg-red-300';
    if (row.species === 'CORN') return 'bg-blue-500';
    return 'bg-brand-green';
  }

  function barFillClass(row: QueueRow, isRush: boolean, isHold: boolean) {
    if (isRush) return 'bg-orange-400';
    if (isHold) return 'bg-red-300';
    if (row.species === 'CORN') return 'bg-blue-500';
    return 'bg-brand-green';
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
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {s.ganttTitle}
          <span className="font-normal text-gray-400" title={s.ganttHint}>
            ⓘ
          </span>
        </h3>
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
            </div>
          )}
          <span className="rounded border border-gray-200 px-2 py-0.5">{s.zoom1h}</span>
          <ToolbarBtn label="Zoom in">+</ToolbarBtn>
          <ToolbarBtn label="Zoom out">−</ToolbarBtn>
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
                const place = scale ? barPlacement(row.finish, scale) : { left: 2, width: 16 };
                const color = barTrackClass(row, isRush, isHold);

                return (
                  <li
                    key={row.po}
                    className={`grid grid-cols-[14rem_1fr] items-center gap-2 py-2 ${
                      isRush ? 'bg-orange-50/80 ring-1 ring-inset ring-orange-300' : ''
                    }`}
                  >
                    <div className="px-1" title={s.queuePosition.replace('{n}', String(index + 1))}>
                      {renderRowMeta(row, index, isRush)}
                    </div>
                    <div className="relative h-11 rounded bg-gray-50/80">
                      <div
                        className={`absolute top-1.5 flex h-8 items-center rounded px-2 text-[10px] font-medium text-white shadow ${color}`}
                        style={{ left: `${place.left}%`, width: `${place.width}%` }}
                        title={row.finish}
                      >
                        {isRush && <span className="mr-1">✦</span>}
                        {parseFinish(row.finish) != null
                          ? formatDay(parseFinish(row.finish) as number, locale)
                          : row.finish}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div
          className={expanded ? 'min-h-0 flex-1 overflow-auto p-4' : `${GANTT_SCROLL_MAX_CLASS} overflow-x-auto overflow-y-auto p-3`}
          tabIndex={0}
          role="region"
          aria-label={s.ganttScrollRegionHorizontal}
        >
          <div className="flex min-w-min snap-x snap-mandatory gap-3 pb-1">
            {rows.map((row, index) => {
              const isRush = row.po === rushPo;
              const isHold = row.status === 'HOLD';
              const place = scale ? barPlacement(row.finish, scale) : { left: 2, width: 16 };
              const fill = barFillClass(row, isRush, isHold);

              return (
                <article
                  key={row.po}
                  className={`flex w-40 shrink-0 snap-start flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${
                    isRush ? 'ring-2 ring-orange-300' : ''
                  }`}
                >
                  {renderRowMeta(row, index, isRush)}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${fill}`} style={{ width: `${place.width}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] leading-snug text-gray-600">
                    {isHold ? s.holdShort : row.finish}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-500">
        <span>{footer}</span>
        {rows.length > 8 && <span className="text-gray-400">{s.ganttScrollHint}</span>}
      </div>
    </div>
    </>
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
