import type { QueueRow } from '../../demo/plant/plantDemoTypes';

type PlantMiniTimelineProps = {
  title: string;
  subtitle: string;
  rows: QueueRow[];
  rushPo?: string;
};

/** Simplified week view — visual anchor matching the wow mockup (not a production Gantt). */
export function PlantMiniTimeline({ title, subtitle, rows, rushPo }: PlantMiniTimelineProps) {
  const active = rows.filter((r) => r.status !== 'COMPLETE');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <div className="overflow-x-auto p-4">
        <div className="mb-2 grid grid-cols-[8rem_repeat(7,minmax(3rem,1fr))] gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          <span />
          {days.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <ul className="space-y-2">
          {active.map((row) => {
            const isRush = row.po === rushPo;
            const startCol = Math.min(6, Math.max(0, active.indexOf(row) % 5));
            const span = row.species === 'CORN' ? 2 : 1;
            return (
              <li
                key={row.po}
                className="grid grid-cols-[8rem_repeat(7,minmax(3rem,1fr))] items-center gap-1"
              >
                <span className="truncate font-mono text-[11px] text-gray-700" title={row.po}>
                  {row.po.slice(-7)}
                  {isRush && (
                    <span className="ml-1 rounded bg-orange-500 px-1 text-[9px] font-bold text-white">RUSH</span>
                  )}
                </span>
                {days.map((d, i) => {
                  const show = i >= startCol && i < startCol + span;
                  if (!show) return <span key={d} className="h-6" />;
                  return (
                    <span
                      key={d}
                      className={`h-6 rounded ${
                        isRush
                          ? 'bg-orange-400'
                          : row.status === 'HOLD'
                            ? 'bg-red-300'
                            : row.species === 'CORN'
                              ? 'bg-blue-400'
                              : 'bg-brand-green'
                      }`}
                      title={`${row.species} · ${row.kg} kg`}
                    />
                  );
                })}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
