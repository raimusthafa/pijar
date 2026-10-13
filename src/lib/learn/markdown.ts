// Tiny, safe markdown subset for lesson text: headings, paragraphs, lists, fenced code, **bold**, `code`.
// Returns data only; the component turns it into React nodes, so nothing is ever injected as HTML.

export type Inline = { t: 'text' | 'b' | 'code'; v: string };
export type Block =
  | { type: 'p'; inline: Inline[] }
  | { type: 'h'; level: 3 | 4; inline: Inline[] }
  | { type: 'ul' | 'ol'; items: Inline[][] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'hr' };

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let last = 0;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m.index > last) out.push({ t: 'text', v: src.slice(last, m.index) });
    out.push(m[1] !== undefined ? { t: 'b', v: m[1] } : { t: 'code', v: m[2] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: 'text', v: src.slice(last) });
  return out;
}

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', inline: parseInline(para.join(' ')) });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*```(\w*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code: string[] = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) code.push(lines[i]);
      blocks.push({ type: 'code', lang: fence[1], code: code.join('\n') });
      continue;
    }
    if (/^\s*([-*_]){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ type: 'hr' });
      continue;
    }
    const h = /^(#{1,6})\s+(.*\S)\s*$/.exec(line);
    if (h) {
      flush();
      blocks.push({ type: 'h', level: h[1].length <= 3 ? 3 : 4, inline: parseInline(h[2].replace(/:$/, '')) });
      continue;
    }
    const li = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (li) {
      flush();
      const type = li[1] ? 'ul' : 'ol';
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === type) prev.items.push(parseInline(li[3]));
      else blocks.push({ type, items: [parseInline(li[3])] });
      continue;
    }
    if (!line.trim()) flush();
    else para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Word count of the plain text, for the read-time byline. */
export const countWords = (s: string) => (s.match(/\S+/g) ?? []).length;
