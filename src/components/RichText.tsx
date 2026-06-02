import type { ReactNode } from "react";

type RichTextProps = {
  content: string;
  className?: string;
};

type Token = {
  type:
    | "heading"
    | "list"
    | "orderedList"
    | "blockquote"
    | "codeBlock"
    | "hr"
    | "paragraph"
    | "empty";
  depth?: number;
  children: ReactNode;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(!\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(escapeHtml(text.slice(lastIndex, match.index)));
    }

    if (match[1]) {
      // ![alt](url) → <img>
      nodes.push(
        <img
          key={`img-${match.index}`}
          src={match[3]}
          alt={match[2]}
          style={{ maxWidth: "100%", height: "auto" }}
        />
      );
    } else if (match[4]) {
      nodes.push(
        <strong key={`b-${match.index}`}>{renderInline(match[5])}</strong>
      );
    } else if (match[6]) {
      nodes.push(<em key={`i-${match.index}`}>{renderInline(match[7])}</em>);
    } else if (match[8]) {
      nodes.push(
        <code key={`c-${match.index}`} className="inline-code">
          {escapeHtml(match[9])}
        </code>
      );
    } else if (match[10]) {
      nodes.push(
        <a
          key={`a-${match.index}`}
          href={match[12]}
          target="_blank"
          rel="noopener noreferrer"
        >
          {match[11]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(escapeHtml(text.slice(lastIndex)));
  }

  return nodes;
}

function parseTokens(content: string): Token[] {
  const lines = content.split("\n");
  const tokens: Token[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      tokens.push({ type: "empty", children: [] });
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      tokens.push({
        type: "heading",
        depth: headingMatch[1].length,
        children: renderInline(headingMatch[2]),
      });
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      tokens.push({
        type: "blockquote",
        children: renderInline(quoteLines.join("\n")),
      });
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: ReactNode[][] = [];
      while (i < lines.length) {
        const lt = lines[i].trim();
        if (lt.startsWith("- ") || lt.startsWith("* ")) {
          items.push(renderInline(lt.slice(2)));
          i++;
        } else {
          break;
        }
      }
      tokens.push({
        type: "list",
        children: items.map((item, idx) => <li key={idx}>{item}</li>),
      });
      continue;
    }

    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      const olItems: ReactNode[][] = [];
      while (i < lines.length) {
        const lt2 = lines[i].trim();
        const m = lt2.match(/^\d+\.\s+(.+)$/);
        if (m) {
          olItems.push(renderInline(m[1]));
          i++;
        } else {
          break;
        }
      }
      tokens.push({
        type: "orderedList",
        children: olItems.map((item, idx) => <li key={idx}>{item}</li>),
      });
      continue;
    }

    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      tokens.push({ type: "hr", children: [] });
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      tokens.push({
        type: "codeBlock",
        children: [
          <pre key="cb">
            <code>{codeLines.join("\n")}</code>
          </pre>,
        ],
      });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("#") &&
      !lines[i].trim().startsWith("```") &&
      !lines[i].trim().startsWith("> ") &&
      !lines[i].trim().startsWith("- ") &&
      !lines[i].trim().startsWith("* ") &&
      !lines[i].trim().match(/^\d+\.\s+/)
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }

    tokens.push({
      type: "paragraph",
      children: renderInline(paraLines.join(" ")),
    });
  }

  return tokens;
}

export default function RichText({ content, className }: RichTextProps) {
  const tokens = parseTokens(content);

  return (
    <div className={className}>
      {tokens.map((token, index) => {
        switch (token.type) {
          case "heading":
            const H = `h${token.depth}` as keyof JSX.IntrinsicElements;
            return <H key={index}>{token.children}</H>;
          case "list":
            return <ul key={index}>{token.children}</ul>;
          case "orderedList":
            return <ol key={index}>{token.children}</ol>;
          case "blockquote":
            return <blockquote key={index}>{token.children}</blockquote>;
          case "codeBlock":
            return (
              <div key={index} className="code-block">
                {token.children}
              </div>
            );
          case "hr":
            return <hr key={index} />;
          case "empty":
            return <br key={index} />;
          default:
            return <p key={index}>{token.children}</p>;
        }
      })}
    </div>
  );
}
