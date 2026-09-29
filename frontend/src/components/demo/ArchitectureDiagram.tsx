type ArchitectureDiagramProps = {
  title: string;
  description?: string;
  diagram: string;
};

export function ArchitectureDiagram({ title, description, diagram }: ArchitectureDiagramProps) {
  return (
    <section className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-brand-blue">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{description}</p>}
      <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-slate-950 shadow-inner">
        <pre className="min-w-min p-4 text-xs leading-relaxed text-emerald-100 sm:p-6 sm:text-sm">{diagram}</pre>
      </div>
    </section>
  );
}
