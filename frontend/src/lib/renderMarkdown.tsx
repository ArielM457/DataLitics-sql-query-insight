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

type ListBlock = { type: "ol" | "ul"; items: { title: string; body: string[] }[] };
type TextBlock = { type: "text"; line: string };
type Block = ListBlock | TextBlock;

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let current: ListBlock | null = null;

  const flush = () => { if (current) { blocks.push(current); current = null; } };

  for (const line of lines) {
    const numMatch = line.match(/^\s*\d+[.)]\s+(.*)/);
    const bulMatch = line.match(/^\s*[-*]\s+(.*)/);

    if (numMatch) {
      // Start or continue an ordered list
      if (!current || current.type !== "ol") { flush(); current = { type: "ol", items: [] }; }
      current.items.push({ title: numMatch[1], body: [] });
    } else if (bulMatch) {
      // Start or continue an unordered list
      if (!current || current.type !== "ul") { flush(); current = { type: "ul", items: [] }; }
      current.items.push({ title: bulMatch[1], body: [] });
    } else if (line.trim() === "") {
      // Blank line — keep inside a list block so items stay grouped
      // Only flush if we're not in a list
      if (!current) blocks.push({ type: "text", line: "" });
    } else {
      // Regular text line
      if (current && current.items.length > 0) {
        // Attach as body of the last list item
        current.items[current.items.length - 1].body.push(line);
      } else {
        flush();
        blocks.push({ type: "text", line });
      }
    }
  }

  flush();
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
