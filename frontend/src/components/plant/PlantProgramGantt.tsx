import type { ReactNode } from 'react';
import type { QueueRow } from '../../demo/plant/plantDemoTypes';
import { PLANT_SCHEDULE_META } from '../../demo/plant/plantScheduleMeta';
import { useLocale } from '../../i18n';

type PlantProgramGanttProps = {
  rows: QueueRow[];
  rushPo?: string;
  compact?: boolean;
};

const SLOTS = 28;

function slotSpan(index: number, species: string, kg: number) {
  const start = 1 + (index % 6) * 2;
  const span = species === 'CORN' ? 6 : kg > 4000 ? 5 : 4;
  return { start, span: Math.min(span, SLOTS - start) };
}

export function PlantProgramGantt({ rows, rushPo, compact }: PlantProgramGanttProps) {
  const { messages: m } = useLocale();
  const s = m.plantMvp.scheduleShell;
  const active = rows.filter((r) => r.status !== 'COMPLETE');

  return (
    <div
      className={`min-w-0 flex-1 bg-white ${compact ? '' : 'border-r border-gray-200'}`}
    >
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          {s.ganttTitle}
          <span className="font-normal text-gray-400" title={s.ganttHint}>
            ⓘ
          </span>
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span className="rounded border border-gray-200 px-2 py-0.5">{s.zoom1h}</span>
          <ToolbarBtn label="Zoom in">+</ToolbarBtn>
          <ToolbarBtn label="Zoom out">−</ToolbarBtn>
          <ToolbarBtn label="Full width">⤢</ToolbarBtn>
        </div>
      </div>

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
            {active.map((row, index) => {
              const meta = PLANT_SCHEDULE_META[row.po] ?? {
                client: 'Demo customer',
                productCode: `${row.species} batch`,
                priority: 3 as const,
              };
              const isRush = row.po === rushPo;
              const isHold = row.status === 'HOLD';
              const { start, span } = slotSpan(index, row.species, row.kg);
              const leftPct = (start / SLOTS) * 100;
              const widthPct = (span / SLOTS) * 100;
              const barColor = isRush
                ? 'bg-orange-400 ring-2 ring-orange-500'
                : isHold
                  ? 'bg-red-300'
                  : row.species === 'CORN'
                    ? 'bg-blue-500'
                    : 'bg-brand-green';

              return (
                <li
                  key={row.po}
                  className={`grid grid-cols-[10.5rem_1fr] gap-2 py-2 ${
                    isRush ? 'bg-orange-50/80 ring-1 ring-inset ring-orange-300' : ''
                  }`}
                >
                  <div className="px-1">
                    <p className="font-mono text-[11px] font-semibold text-gray-900">
                      PO {row.po}
                      {isRush && (
                        <span className="ml-1 rounded bg-orange-500 px-1 text-[9px] font-bold text-white">
                          {s.urgent}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-500">{meta.productCode}</p>
                    <p className="mt-0.5 text-[9px] text-gray-600">
                      {row.species === 'CORN' ? '🌽' : '🌿'} {meta.client}
                    </p>
                    <span
                      className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold ${
                        meta.priority === 2
                          ? 'bg-orange-100 text-orange-800'
                          : meta.priority === 4
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {s.priority} {meta.priority}
                    </span>
                  </div>
                  <div className="relative h-11 rounded bg-gray-50/80">
                    <div
                      className={`absolute top-1.5 flex h-8 items-center rounded px-2 text-[10px] font-medium text-white shadow ${barColor}`}
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
    </div>
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
