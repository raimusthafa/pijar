import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { speakTex, splitMath } from '@/lib/learn/math-text';

// The one place KaTeX output (HTML we did not write) is injected. AI text itself is never injected:
// splitMath separates prose, which React escapes, from formulas, which only KaTeX turns into markup.
const cache = new Map<string, string>();

function renderTex(tex: string, display: boolean): string {
  const key = `${display ? 'D' : 'I'}${tex}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const html = katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    trust: false,
    strict: false,
    output: 'html',
    errorColor: 'var(--pj-danger)',
    maxExpand: 200,
  });
  if (cache.size > 500) cache.clear();
  cache.set(key, html);
  return html;
}

/** Renders prose that may contain $...$, $$...$$, \(...\) and \[...\] as React text plus KaTeX. */
export function MathText({ text }: { text: string }) {
  if (!text || (!text.includes('$') && !text.includes('\\'))) return <>{text}</>;
  return (
    <>
      {splitMath(text).map((s, i) =>
        s.t === 'text' ? (
          <React.Fragment key={i}>{s.v}</React.Fragment>
        ) : (
          <span
            key={i}
            role="img"
            aria-label={speakTex(s.v)}
            className={s.display ? 'block overflow-x-auto py-2 text-center' : undefined}
            dangerouslySetInnerHTML={{ __html: renderTex(s.v, s.display) }}
          />
        ),
      )}
    </>
  );
}
