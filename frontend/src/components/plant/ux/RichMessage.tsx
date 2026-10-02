import type { ReactNode } from 'react';

/** Renders copy with **bold** markers and optional plain {placeholders} already substituted. */
export function RichMessage({ text, className = '' }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={index} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}

export function RichParagraph({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p className={className}>
      <RichMessage text={text} />
    </p>
  );
}

export function RichList({ items }: { items: string[] }) {
  return (
    <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700">
      {items.map((item) => (
        <li key={item}>
          <RichMessage text={item} />
        </li>
      ))}
    </ul>
  );
}

export function substitutePlaceholders(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replace(new RegExp(`\\{${key}\\}`, 'g'), value),
    text,
  );
}

export function richLine(text: string, vars: Record<string, string>): ReactNode {
  return <RichMessage text={substitutePlaceholders(text, vars)} />;
}
