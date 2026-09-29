type PlantFlowApiPanelProps = {
  trigger: string;
  backendOwners: string;
  backendOwnersLabel: string;
  method: 'GET' | 'POST';
  path: string;
  request?: unknown;
  response: unknown;
  mapping?: { jsonPath: string; ui: string }[];
  /** Narrow column beside wide UI preview on /demo/plant/flow */
  compact?: boolean;
};

export function PlantFlowApiPanel({
  trigger,
  backendOwners,
  backendOwnersLabel,
  method,
  path,
  request,
  response,
  mapping,
  compact,
}: PlantFlowApiPanelProps) {
  const json = (value: unknown) => JSON.stringify(value, null, 2);

  return (
    <div
      className={`h-full rounded-xl border border-gray-200 bg-slate-900 p-3 text-slate-100 shadow-sm sm:p-4 lg:sticky lg:top-20 ${
        compact ? 'max-h-[min(70vh,640px)] overflow-y-auto' : ''
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">When &amp; API</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-200">{trigger}</p>
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
          {backendOwnersLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-slate-200">{backendOwners}</p>
      </div>
      <p className="mt-4">
        <span
          className={`mr-2 rounded px-2 py-0.5 text-xs font-bold ${
            method === 'GET' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
          }`}
        >
          {method}
        </span>
        <code className="text-sm text-emerald-300">{path}</code>
      </p>
      {request != null && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase text-slate-400">Request</p>
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">
            {json(request)}
          </pre>
        </>
      )}
      <p className="mt-4 text-xs font-semibold uppercase text-slate-400">Response → UI</p>
      <pre
        className={`mt-1 overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300 ${
          compact ? 'max-h-48' : 'max-h-72'
        }`}
      >
        {json(response)}
      </pre>
      {mapping && mapping.length > 0 && (
        <table className="mt-4 w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-700 text-slate-400">
              <th className="py-1 pr-2">JSON</th>
              <th className="py-1">UI</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {mapping.map((row) => (
              <tr key={row.jsonPath} className="border-b border-slate-800">
                <td className="py-1.5 pr-2 font-mono text-sky-300">{row.jsonPath}</td>
                <td className="py-1.5">{row.ui}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
