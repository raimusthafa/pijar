// Mechanical enforcement of simple-ui-rule.md over src/**/*.{ts,tsx}.
// Every rule has a synthetic violator and a near miss (CLAUDE.md 4.12), so a detector that matches nothing cannot pass silently.
// Allowlists are explicit and tiny. Comments are stripped before the code rules run (not before the emoji rule).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(fileURLToPath(new URL('..', import.meta.url)), 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\'"`])\/\/.*$/gm, '$1');

// Allowlists: file (relative to src, posix) -> why.
const ALLOW = {
  gradient: {
    // E1 (CLAUDE.md 8.3): the hero and closing panels carry one token-based amber gradient.
    'app/page.tsx': 'E1 hero and closing panel',
  },
  shadow: {},
  hex: {},
};

/** Each rule returns the list of matches for one file's source text. */
const RULES = {
  emoji: {
    check: (src) => src.match(/(?![©®™])\p{Extended_Pictographic}/gu) ?? [],
    bad: 'const a = "Selamat 🎉";',
    near: 'const a = "Hak cipta © 2026";',
    raw: true,
  },
  dash: {
    // Em or en dash in any code line (comments stripped): i18n messages, JSX text, template literals.
    check: (src) => {
      const code = stripComments(src);
      // Messages and any other source string (template literals, AI fallback copy) may not carry a dash. JSX text is covered by the same line scan.
      return code.match(/[^\n]*[—–][^\n]*/g) ?? [];
    },
    bad: '<p>Satu — dua</p>',
    near: '<p>Satu - dua</p>',
    badMsg: "'a': 'Satu – dua',",
    nearMsg: "'a': 'Satu - dua', // note — only in a comment",
  },
  shadow: {
    check: (src) => stripComments(src).match(/(?<![\w-])(?:[a-z-]+:)*shadow(?:-(?:sm|md|lg|xl|2xl|inner|\[[^\]]*\]|none))?(?![\w-])|box-?[sS]hadow/g) ?? [],
    bad: '<div className="rounded-card shadow-lg" />',
    near: '<div className="text-shadow-none-not-a-thing rounded-card" data-shadowroot />',
    allowKey: 'shadow',
  },
  stripe: {
    check: (src) => stripComments(src).match(/\bborder-[lr]-(?!0\b)[\w[]/g) ?? [],
    bad: '<div className="border-l-4 border-amber" />',
    near: '<div className="border-b-4 border-amber border-l-0" />',
  },
  tonalChip: {
    check: (src) => {
      const out = [];
      for (const m of stripComments(src).matchAll(/["'`]([^"'`\n]*)["'`]/g)) {
        const s = m[1];
        const palette = /\bbg-(\w+)-(?:50|100|200)\b/.exec(s);
        if (palette && new RegExp(`\\btext-${palette[1]}-(?:600|700|800|900)\\b`).test(s)) out.push(s);
        const token = /\bbg-(amber|danger|warning|success)\/\d+\b/.exec(s);
        if (token && new RegExp(`\\btext-${token[1]}(?![\\w-])`).test(s)) out.push(s);
        const solid = /\bbg-(amber|danger|warning|success)(?![\w/-])/.exec(s);
        if (solid && new RegExp(`\\btext-${solid[1]}(?![\\w-])`).test(s)) out.push(s);
      }
      for (const m of stripComments(src).matchAll(/<Badge[^>]*variant=["'](amber|accent|danger|warning|success)["'][^>]*className=["'][^"']*\btext-(amber|danger|warning|success)(?![\w-])/g)) out.push(m[0]);
      return out;
    },
    bad: '<span className="bg-red-100 text-red-800" />',
    near: '<span className="bg-danger text-danger-foreground" />',
    bad2: '<span className="bg-amber/15 text-amber" />',
  },
  hex: {
    // Hex colours belong in globals.css only. A '#' directly after a quote, slash or space is a URL anchor or text, not a colour.
    check: (src) => stripComments(src).match(/(?<![\w/&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g) ?? [],
    bad: "ctx.fillStyle = '#fff';",
    near: '<a href="/#cara-kerja">x</a> Tugas #12 &#39;',
    allowKey: 'hex',
  },
  font: {
    check: (src) => stripComments(src).match(/\b(?:Inter|Geist(?:_Mono)?|Space[ _]Grotesk)\b/g) ?? [],
    bad: "import { Inter } from 'next/font/google';",
    near: 'const interactive = true; // Intermediate Interval',
  },
  sparkles: {
    check: (src) => stripComments(src).match(/import[^;]*\bSparkles?\b[^;]*from\s*['"]lucide-react['"]/g) ?? [],
    bad: "import { Sparkles, Check } from 'lucide-react';",
    near: "import { Check } from 'lucide-react'; const Sparkler = 1;",
  },
  gradient: {
    check: (src) => stripComments(src).match(/(?:linear|radial|conic)-gradient\(|\bbg-(?:gradient|linear|radial|conic)-?(?:to-|\[)?|\b(?:from|via|to)-\[?(?:amber|ink|ground|surface|raised|[a-z]+-\d{2,3})\b/g) ?? [],
    bad: '<div className="bg-gradient-to-r from-amber to-ink" />',
    near: '<div className="bg-surface text-foreground" />',
    allowKey: 'gradient',
  },
};

const hit = (rule, text, file = 'components/x.tsx') => RULES[rule].check(text, file).length;

test('detectors: every rule catches its violator and ignores its near miss', () => {
  for (const [name, r] of Object.entries(RULES)) {
    assert.ok(hit(name, r.bad) > 0, `${name} missed its violator`);
    assert.equal(hit(name, r.near), 0, `${name} flagged its near miss`);
  }
  assert.ok(hit('dash', RULES.dash.badMsg, 'lib/i18n/messages/x.ts') > 0, 'dash missed a message violator');
  assert.equal(hit('dash', RULES.dash.nearMsg, 'lib/i18n/messages/x.ts'), 0, 'dash flagged a comment-only dash in messages');
  assert.ok(hit('tonalChip', RULES.tonalChip.bad2) > 0, 'tonalChip missed bg-amber/15 text-amber');
  assert.ok(hit('tonalChip', '<Badge variant="success" className="text-success" />') > 0, 'tonalChip missed same-hue Badge');
  assert.equal(hit('tonalChip', '<Badge variant="success" className="text-xs" />'), 0);
});

const FILES = walk(SRC).map((f) => ({ f, rel: relative(SRC, f).split(sep).join('/'), text: readFileSync(f, 'utf8') }));

test('scan covers the source tree', () => {
  assert.ok(FILES.length > 50, `only ${FILES.length} files found`);
});

for (const [name, r] of Object.entries(RULES)) {
  test(`ui rule: ${name}`, () => {
    const allowed = r.allowKey ? ALLOW[r.allowKey] : {};
    const bad = [];
    for (const { rel, text } of FILES) {
      if (allowed[rel]) continue;
      const found = r.check(r.raw ? text : text, rel);
      if (found.length) bad.push(`${rel}: ${found.slice(0, 3).map((s) => String(s).trim().slice(0, 80)).join(' | ')}`);
    }
    assert.deepEqual(bad, [], `${name} violations:\n${bad.join('\n')}`);
  });
}
