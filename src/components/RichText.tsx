import type { ReactNode } from 'react';

type RichTextProps = {
  content: string;
  className?: string;
};

function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<strong key={`${match.index}-${match[1]}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function RichText({ content, className }: RichTextProps) {
  const lines = content.split(/\n+/).filter((line) => line.trim());

  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 12)}`}>{renderInline(line.trim())}</p>
      ))}
    </div>
  );
}
