import type { ReactNode } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { PLANT_SCHEDULE_META } from '../../demo/plant/plantScheduleMeta';
import type { PlantPageSize } from '../../hooks/useListPagination';
import { useLocale } from '../../i18n';
import { PlantListPagination } from './PlantListPagination';

export type ScheduleGanttLayout = 'vertical' | 'horizontal';

type PlantProgramGanttProps = {
  rows: QueueRow[];
  rushPo?: string;
  compact?: boolean;
  layout?: ScheduleGanttLayout;
  onLayoutChange?: (layout: ScheduleGanttLayout) => void;
  page?: number;
  pageSize?: PlantPageSize;
  totalRows?: number;
  totalPages?: number;
  from?: number;
  to?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: PlantPageSize) => void;
};

const SLOTS = 28;

function slotSpan(index: number, species: string, kg: number) {
  const start = 1 + (index % 6) * 2;
  const span = species === 'CORN' ? 6 : kg > 4000 ? 5 : 4;
  return { start, span: Math.min(span, SLOTS - start) };
}

export function PlantProgramGantt({
  rows,
  rushPo,
  compact,
  layout = 'vertical',
  onLayoutChange,
  page = 1,
  pageSize = 10,
  totalRows,
  totalPages = 1,
  from = 1,
  to = rows.length,
  onPageChange,
  onPageSizeChange,
}: PlantProgramGanttProps) {
  const { messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const p = m.plantMvp.pagination;
  const showPagination = Boolean(onPageChange && onPageSizeChange);
  const total = totalRows ?? rows.length;

  function renderRowMeta(row: QueueRow, isRush: boolean) {
    const meta = PLANT_SCHEDULE_META[row.po] ?? {
      client: 'Demo customer',
      productCode: `${row.species} batch`,
      priority: 3 as const,
    };
    return (
      <>
        <p className="font-mono text-[11px] font-semibold text-gray-900">
          PO {row.po}
          {isRush && (
            <span className="ml-1 rounded bg-orange-500 px-1 text-[9px] font-bold text-white">{s.urgent}</span>
          )}
        </p>
        <p className="text-[10px] text-gray-500">{meta.productCode}</p>
        <p className="mt-0.5 text-[9px] text-gray-600">
          {row.species === 'CORN' ? '🌽' : '🌿'} {meta.client}
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

  return (
    <div className={`min-w-0 flex-1 bg-white ${compact ? '' : 'border-r border-gray-200'}`}>
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
          <ToolbarBtn label="Full width">⤢</ToolbarBtn>
        </div>
      </div>

      {layout === 'vertical' ? (
        <div className="overflow-x-auto p-2">
          <div className="min-w-[640px]">
            <div className="mb-1 grid grid-cols-[10.5rem_1fr] gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              <span />
              <div className="grid grid-cols-7 gap-1 text-center">
                {s.dayHeaders.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
            </div>

            <ul className="space-y-0 divide-y divide-gray-100 border-y border-gray-100">
              {rows.map((row, index) => {
                const isRush = row.po === rushPo;
                const isHold = row.status === 'HOLD';
                const { start, span } = slotSpan(index, row.species, row.kg);
                const leftPct = (start / SLOTS) * 100;
                const widthPct = (span / SLOTS) * 100;
                const color = barTrackClass(row, isRush, isHold);

                return (
                  <li
                    key={row.po}
                    className={`grid grid-cols-[10.5rem_1fr] gap-2 py-2 ${
                      isRush ? 'bg-orange-50/80 ring-1 ring-inset ring-orange-300' : ''
                    }`}
                  >
                    <div className="px-1">{renderRowMeta(row, isRush)}</div>
                    <div className="relative h-11 rounded bg-gray-50/80">
                      <div
                        className={`absolute top-1.5 flex h-8 items-center rounded px-2 text-[10px] font-medium text-white shadow ${color}`}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      >
                        {isRush && <span className="mr-1">✦</span>}
                        {row.finish.includes(' ') ? row.finish.split(' ')[1]?.slice(0, 5) : row.finish}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto p-3">
          <div className="flex min-w-min gap-3">
            {rows.map((row, index) => {
              const isRush = row.po === rushPo;
              const isHold = row.status === 'HOLD';
              const { span } = slotSpan(index, row.species, row.kg);
              const widthPct = (span / SLOTS) * 100;
              const fill = barFillClass(row, isRush, isHold);

              return (
                <article
                  key={row.po}
                  className={`flex w-40 shrink-0 flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm ${
                    isRush ? 'ring-2 ring-orange-300' : ''
                  }`}
                >
                  {renderRowMeta(row, isRush)}
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className={`h-full rounded-full ${fill}`} style={{ width: `${widthPct}%` }} />
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

      {showPagination && (
        <div className="border-t border-gray-100 px-4">
          <PlantListPagination
            page={page}
            pageSize={pageSize}
            totalPages={totalPages}
            from={from}
            to={to}
            total={total}
            onPageChange={onPageChange!}
            onPageSizeChange={onPageSizeChange!}
            labels={p}
          />
        </div>
      )}
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

function ToolbarBtn({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="rounded border border-gray-200 px-1.5 py-0.5 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}
