type ArchitectureImageDiagramProps = {
  title: string;
  description?: string;
  src: string;
  alt: string;
};

export function ArchitectureImageDiagram({ title, description, src, alt }: ArchitectureImageDiagramProps) {
  return (
    <section className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-brand-blue">{title}</h2>
      {description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">{description}</p>}
      <figure className="mt-4 w-full overflow-hidden rounded-xl border border-gray-200 bg-slate-950 shadow-md">
        <img
          src={src}
          alt={alt}
          className="block h-auto min-h-[200px] w-full object-contain object-center"
          loading="lazy"
          decoding="async"
        />
        <figcaption className="border-t border-gray-800 px-4 py-2 text-center text-xs text-gray-400">{alt}</figcaption>
      </figure>
    </section>
  );
}
