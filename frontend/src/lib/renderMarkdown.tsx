import { Fragment } from "react";

export function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="bg-brand-light/60 rounded px-1 text-xs font-mono">{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function parseTableRow(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s|:\-]+\|$/.test(line.trim());
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith("|") && line.trim().endsWith("|");
}

type ListBlock = { type: "ol" | "ul"; items: { title: string; body: string[] }[] };
type TextBlock = { type: "text"; line: string };
type TableBlock = { type: "table"; headers: string[]; rows: string[][] };
type Block = ListBlock | TextBlock | TableBlock;

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let current: ListBlock | null = null;
  let tableLines: string[] = [];

  const flushList = () => { if (current) { blocks.push(current); current = null; } };

  const flushTable = () => {
    if (tableLines.length < 2) {
      tableLines.forEach((l) => blocks.push({ type: "text", line: l }));
      tableLines = [];
      return;
    }
    const headers = parseTableRow(tableLines[0]);
    const dataRows = tableLines
      .slice(1)
      .filter((l) => !isTableSeparator(l))
      .map(parseTableRow);
    blocks.push({ type: "table", headers, rows: dataRows });
    tableLines = [];
  };

  for (const line of lines) {
    if (isTableRow(line)) {
      flushList();
      tableLines.push(line);
      continue;
    }

    if (tableLines.length > 0) {
      flushTable();
    }

    const numMatch = line.match(/^\s*\d+[.)]\s+(.*)/);
    const bulMatch = line.match(/^\s*[-*]\s+(.*)/);

    if (numMatch) {
      if (!current || current.type !== "ol") { flushList(); current = { type: "ol", items: [] }; }
      current.items.push({ title: numMatch[1], body: [] });
    } else if (bulMatch) {
      if (!current || current.type !== "ul") { flushList(); current = { type: "ul", items: [] }; }
      current.items.push({ title: bulMatch[1], body: [] });
    } else if (line.trim() === "") {
      if (!current) blocks.push({ type: "text", line: "" });
    } else {
      if (current && current.items.length > 0) {
        current.items[current.items.length - 1].body.push(line);
      } else {
        flushList();
        blocks.push({ type: "text", line });
      }
    }
  }

  if (tableLines.length > 0) flushTable();
  flushList();
  return blocks;
}

export function renderMarkdown(text: string): React.ReactNode {
  const blocks = parseBlocks(text);

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === "text") {
          if (block.line === "") return <br key={i} />;
          return (
            <span key={i} className="block leading-relaxed">
              {renderInline(block.line)}
            </span>
          );
        }

        if (block.type === "table") {
          return (
            <div
              key={i}
              className="my-2 rounded-lg border border-brand-light overflow-auto"
              style={{ maxHeight: "260px", maxWidth: "100%" }}
            >
              <table className="text-xs border-collapse" style={{ minWidth: "max-content", width: "100%" }}>
                <thead>
                  <tr className="bg-brand-light sticky top-0">
                    {block.headers.map((h, j) => (
                      <th key={j} className="px-3 py-2 font-semibold text-brand-deepest text-left whitespace-nowrap border-b border-brand-light">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, j) => (
                    <tr key={j} className="border-t border-brand-light/50 odd:bg-white even:bg-brand-light/20 hover:bg-brand-light/40 transition-colors">
                      {row.map((cell, k) => (
                        <td key={k} className="px-3 py-1.5 text-brand-deepest/80 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const Tag = block.type === "ol" ? "ol" : "ul";
        return (
          <Tag
            key={i}
            className={
              block.type === "ol"
                ? "list-decimal list-inside space-y-3 my-2"
                : "list-disc list-inside space-y-1.5 my-2"
            }
          >
            {block.items.map((item, j) => (
              <li key={j} className="text-sm leading-relaxed">
                {renderInline(item.title)}
                {item.body.length > 0 && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {item.body.map((b, k) => (
                      <span key={k} className="block text-sm leading-relaxed opacity-90">
                        {renderInline(b)}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </Tag>
        );
      })}
    </>
  );
}
