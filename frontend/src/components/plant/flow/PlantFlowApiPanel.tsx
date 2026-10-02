type PlantFlowApiPanelProps = {
  trigger: string;
  backendOwners: string;
  backendOwnersLabel: string;
  method: 'GET' | 'POST';
  path: string;
  request?: unknown;
  response: unknown;
  mapping?: { jsonPath: string; ui: string }[];
  requestHeading: string;
  responseHeading: string;
  noBody: string;
};

function exampleCall(method: string, path: string): { line: string; note?: string } {
  const noteMatch = path.match(/\s+(\([^)]*\))\s*$/);
  const clean = path.replace(/\s+\([^)]*\)\s*$/, '').replace(/\{lineId\}/g, 'line-1');
  const query = method === 'GET' && clean.includes('/queue') ? '?locale=en' : '';
  return { line: `${method} ${clean}${query}`, note: noteMatch?.[1] };
}

export function PlantFlowApiPanel({
  trigger,
  backendOwners,
  backendOwnersLabel,
  method,
  path,
  request,
  response,
  mapping,
  requestHeading,
  responseHeading,
  noBody,
}: PlantFlowApiPanelProps) {
  const json = (value: unknown) => JSON.stringify(value, null, 2);
  const call = exampleCall(method, path);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <p className="text-sm leading-relaxed text-gray-700">{trigger}</p>
      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand-blue">{requestHeading}</h3>
      <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-emerald-300">
        {call.line}
      </pre>
      {call.note ? <p className="mt-2 text-xs text-gray-500">{call.note}</p> : null}
      {request != null ? (
        <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-200">
          {json(request)}
        </pre>
      ) : (
        <p className="mt-3 text-sm text-gray-600">{noBody}</p>
      )}
      <h3 className="mt-5 text-sm font-semibold uppercase tracking-wide text-brand-blue">{responseHeading}</h3>
      <pre className="mt-2 max-h-[32rem] overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed text-slate-200">
        {json(response)}
      </pre>
      {mapping && mapping.length > 0 && (
        <table className="mt-4 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-1.5 pr-3 font-semibold">JSON</th>
              <th className="py-1.5 font-semibold">UI</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {mapping.map((row) => (
              <tr key={row.jsonPath} className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-mono text-brand-blue">{row.jsonPath}</td>
                <td className="py-1.5">{row.ui}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{backendOwnersLabel}</p>
        <p className="mt-1 text-xs leading-relaxed text-gray-600">{backendOwners}</p>
      </div>
    </section>
  );
}
