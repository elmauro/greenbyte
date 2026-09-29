import { useEffect, useId, useRef, useState } from 'react';

type MermaidDiagramProps = {
  chart: string;
  title: string;
  description?: string;
};

let mermaidInitPromise: Promise<typeof import('mermaid').default> | null = null;

async function loadMermaid() {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import('mermaid').then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'strict',
        fontFamily: 'Inter, system-ui, sans-serif',
      });
      return mod.default;
    });
  }
  return mermaidInitPromise;
}

export function MermaidDiagram({ chart, title, description }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId();
  const diagramId = `mermaid-${reactId.replace(/:/g, '')}`;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;

    async function render() {
      try {
        setError(null);
        const mermaid = await loadMermaid();
        const { svg } = await mermaid.render(diagramId, chart);
        if (!cancelled && node) {
          node.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not render diagram');
        }
      }
    }

    void render();

    return () => {
      cancelled = true;
    };
  }, [chart, diagramId]);

  return (
    <section className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-brand-blue">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{description}</p>}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-slate-950 p-4 shadow-inner sm:p-6">
        {error ? (
          <pre className="whitespace-pre-wrap text-sm text-red-300">{error}</pre>
        ) : (
          <div ref={containerRef} className="mermaid-diagram flex min-h-[12rem] justify-center [&_svg]:max-w-none" />
        )}
      </div>
    </section>
  );
}
