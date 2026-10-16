/** The small Markdown Heel writes (headings, lists, paragraphs, links, emphasis, code) as HTML for printing. Pure. */

const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Inline marks on already-escaped text: code first (its insides stay literal), then links, bold, italics, bare URLs. */
export function inline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]*[^\s<).,;:!?])/g, '$1<a href="$2">$2</a>');
}

type Block = { tag: "ul" | "ol" | "p" | "pre"; lines: string[] };

function flush(block: Block | null, out: string[]): null {
  if (!block) return null;
  if (block.tag === "pre") out.push(`<pre><code>${block.lines.join("\n")}</code></pre>`);
  else if (block.tag === "p") out.push(`<p>${inline(block.lines.join(" "))}</p>`);
  else out.push(`<${block.tag}>${block.lines.map((line) => `<li>${inline(line)}</li>`).join("")}</${block.tag}>`);
  return null;
}

export function markdownToHtml(markdown: string): string {
  const out: string[] = [];
  let block: Block | null = null;
  let fenced = false;
  for (const raw of markdown.replace(/\r\n/g, "\n").split("\n")) {
    if (raw.trim().startsWith("```")) {
      if (fenced) block = flush(block, out);
      else {
        block = flush(block, out);
        block = { tag: "pre", lines: [] };
      }
      fenced = !fenced;
      continue;
    }
    if (fenced) {
      block?.lines.push(escapeHtml(raw));
      continue;
    }
    const line = escapeHtml(raw.trim());
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (!line) block = flush(block, out);
    else if (/^(-{3,}|\*{3,})$/.test(line)) (block = flush(block, out)), out.push("<hr>");
    else if (heading) (block = flush(block, out)), out.push(`<h${heading[1]!.length}>${inline(heading[2]!)}</h${heading[1]!.length}>`);
    else if (bullet) block = block?.tag === "ul" ? (block.lines.push(bullet[1]!), block) : (flush(block, out), { tag: "ul", lines: [bullet[1]!] });
    else if (numbered) block = block?.tag === "ol" ? (block.lines.push(numbered[1]!), block) : (flush(block, out), { tag: "ol", lines: [numbered[1]!] });
    else block = block?.tag === "p" ? (block.lines.push(line), block) : (flush(block, out), { tag: "p", lines: [line] });
  }
  flush(block, out);
  return out.join("\n");
}

/** A printable page: the system font, a readable measure, quiet headings. No external resources, so it renders offline. */
export function documentHtml(title: string, markdown: string): string {
  const style = `body{font:12pt -apple-system,"Helvetica Neue",Helvetica,sans-serif;color:#1d1d1f;max-width:46em;margin:0 auto;padding:2em 0;line-height:1.45}
h1{font-size:20pt;margin:0 0 .8em}h2{font-size:14pt;margin:1.4em 0 .4em}h3{font-size:12pt;margin:1.2em 0 .3em}
p,li{margin:0 0 .5em}ul,ol{padding-left:1.4em}a{color:#1d1d1f}code{font:10.5pt ui-monospace,Menlo,monospace}pre{white-space:pre-wrap;padding:.6em .8em;background:#f2f2f2;border-radius:4px}hr{border:0;border-top:1px solid #ccc;margin:1.2em 0}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><h1>${inline(escapeHtml(title))}</h1>\n${markdownToHtml(markdown)}\n</body></html>`;
}
