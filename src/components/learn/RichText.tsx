import { MathText } from '@/components/ui/math-text';
import { parseBlocks, parseInline, type Inline } from '@/lib/learn/markdown';

export function InlineText({ text }: { text: string }) {
  return <Inlines items={parseInline(text)} />;
}

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((x, i) =>
        x.t === 'b' ? (
          <strong key={i} className="font-semibold text-foreground"><MathText text={x.v} /></strong>
        ) : x.t === 'code' ? (
          <code key={i} className="rounded-control bg-surface px-1.5 py-0.5 font-mono text-[0.9em]">{x.v}</code>
        ) : (
          <MathText key={i} text={x.v} />
        ),
      )}
    </>
  );
}

/** Renders the lesson markdown subset as React elements (no HTML injection). */
export function RichText({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-base leading-[1.75] text-foreground">
      {parseBlocks(text).map((b, i) => {
        if (b.type === 'h') {
          return <h3 key={i} className="font-display text-h4 pt-4 first:pt-0"><Inlines items={b.inline} /></h3>;
        }
        if ('items' in b) {
          const List = b.type === 'ul' ? 'ul' : 'ol';
          return (
            <List key={i} className={`${b.type === 'ul' ? 'list-disc' : 'list-decimal'} space-y-2 pl-6 marker:text-muted-foreground`}>
              {b.items.map((it, j) => <li key={j}><Inlines items={it} /></li>)}
            </List>
          );
        }
        if (b.type === 'hr') return <hr key={i} className="border-hairline" />;
        if ('code' in b) return <CodeBlock key={i} code={b.code} language={b.lang} />;
        return <p key={i}><Inlines items={b.inline} /></p>;
      })}
    </div>
  );
}

/** Plain bordered code block: a calm reading surface, not a terminal. */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  if (language && /^(la)?tex$/i.test(language)) {
    return (
      <div className="overflow-x-auto rounded-inner border border-hairline bg-raised p-4 text-foreground">
        <MathText text={`$$${code.trim().replace(/^\$+|\$+$/g, '')}$$`} />
      </div>
    );
  }
  return (
    <figure className="overflow-hidden rounded-inner border border-hairline bg-raised">
      {language && (
        <figcaption className="border-b border-hairline px-4 py-2 font-mono text-xs text-muted-foreground">{language}</figcaption>
      )}
      <pre className="overflow-x-auto p-4 font-mono [font-variant-ligatures:none] text-sm leading-relaxed text-foreground" tabIndex={0}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
