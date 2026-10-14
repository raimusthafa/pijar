// Pure helpers for text that mixes prose and LaTeX: split it safely, and turn it into something TTS can say.
// Supported delimiters: $...$ and \(...\) inline, $$...$$ and \[...\] display, \$ for a literal dollar sign.
// Heuristic for single dollars (so "Rp 5$" or "$5 dan $10" stay prose): the opening $ must not be followed by
// whitespace, the closing $ must not be preceded by whitespace or followed by a digit, and both sit on one line.

export type MathSeg = { t: 'text'; v: string } | { t: 'math'; v: string; display: boolean };

/** JSON turns an unescaped "\frac" into form feed + "rac". Undo that inside formulas only. */
const CONTROL_REPAIR: Record<string, string> = { '\f': '\\f', '\b': '\\b', '\t': '\\t', '\r': '\\r', '\v': '\\v' };
export function repairTex(tex: string): string {
  return tex.replace(/([\f\b\t\r\v])(?=[a-zA-Z])/g, (_, c: string) => CONTROL_REPAIR[c]);
}

/** Index of the next unescaped occurrence of `close` at or after `from`, or -1. */
function findClose(s: string, close: string, from: number): number {
  for (let i = from; i <= s.length - close.length; i++) {
    if (s[i] === '\\') {
      i++; // skip the escaped character (also skips \$ and \\)
      continue;
    }
    if (s.startsWith(close, i)) return i;
  }
  return -1;
}

/** A short string such as "a \times b" that has TeX commands but no delimiters (models forget them in answer options). */
const isBareTex = (s: string) =>
  !/[$]|\\[([]/.test(s) && /\\[a-zA-Z]+/.test(s) && !/[A-Za-z]{3,}/.test(s.replace(/\\[a-zA-Z]+/g, ''));

export function splitMath(src: string): MathSeg[] {
  if (isBareTex(src)) return [{ t: 'math', v: repairTex(src).trim(), display: false }];
  const out: MathSeg[] = [];
  let buf = '';
  const pushText = (v: string) => {
    buf += v;
  };
  const flush = () => {
    if (buf) out.push({ t: 'text', v: buf });
    buf = '';
  };
  const pushMath = (tex: string, display: boolean) => {
    flush();
    out.push({ t: 'math', v: repairTex(tex).trim(), display });
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const n = src[i + 1];
      if (n === '$') {
        pushText('$');
        i += 2;
        continue;
      }
      if (n === '(' || n === '[') {
        const close = n === '(' ? '\\)' : '\\]';
        const end = src.indexOf(close, i + 2);
        const body = end === -1 ? '' : src.slice(i + 2, end);
        if (end !== -1 && body.trim()) {
          pushMath(body, n === '[');
          i = end + 2;
          continue;
        }
      }
      pushText(c);
      i++;
      continue;
    }
    if (c === '$') {
      if (src[i + 1] === '$') {
        const end = findClose(src, '$$', i + 2);
        if (end !== -1 && src.slice(i + 2, end).trim()) {
          pushMath(src.slice(i + 2, end), true);
          i = end + 2;
          continue;
        }
        pushText('$$');
        i += 2;
        continue;
      }
      const next = src[i + 1];
      if (next !== undefined && next !== ' ' && next !== '\n') {
        const end = findClose(src, '$', i + 1);
        if (end !== -1) {
          const body = src.slice(i + 1, end);
          const after = src[end + 1];
          if (!body.includes('\n') && !/[ \n]$/.test(body) && !(after !== undefined && /\d/.test(after))) {
            pushMath(body, false);
            i = end + 1;
            continue;
          }
        }
      }
      pushText('$');
      i++;
      continue;
    }
    pushText(c);
    i++;
  }
  flush();
  return out;
}

export const hasMath = (s: string) => splitMath(s).some((x) => x.t === 'math');

// ── Speech ───────────────────────────────────────────────────────────

type Lang = 'id' | 'en';
const WORDS = {
  id: { over: 'per', pow: 'pangkat', sq: 'kuadrat', cube: 'pangkat tiga', root: 'akar', sub: 'sub', formula: 'rumus', eq: 'sama dengan', plus: 'tambah', minus: 'kurang', times: 'kali', pm: 'plus minus', to: 'menuju', inf: 'tak hingga', int: 'integral', sum: 'sigma', lim: 'limit', le: 'kurang dari sama dengan', ge: 'lebih dari sama dengan', lt: 'kurang dari', gt: 'lebih dari', ne: 'tidak sama dengan', theta: 'teta', deg: 'derajat' },
  en: { over: 'over', pow: 'to the power', sq: 'squared', cube: 'cubed', root: 'square root of', sub: 'sub', formula: 'formula', eq: 'equals', plus: 'plus', minus: 'minus', times: 'times', pm: 'plus or minus', to: 'approaches', inf: 'infinity', int: 'integral', sum: 'sum', lim: 'limit', le: 'less than or equal to', ge: 'greater than or equal to', lt: 'less than', gt: 'greater than', ne: 'not equal to', theta: 'theta', deg: 'degrees' },
} as const;

const SIMPLE_CMDS: Record<string, string> = {
  pi: 'pi', alpha: 'alfa', beta: 'beta', gamma: 'gama', delta: 'delta', lambda: 'lambda', mu: 'mu', sigma: 'sigma', omega: 'omega', phi: 'fi',
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'kotangen', sec: 'sekan', csc: 'kosekan', ln: 'ln', log: 'log', exp: 'eksp',
  arcsin: 'arc sin', arccos: 'arc cos', arctan: 'arc tan', max: 'maks', min: 'min',
};

/** Reads a balanced {...} group starting at s[i] === '{'. Returns the inside and the index after it. */
function group(s: string, i: number): [string, number] | null {
  if (s[i] !== '{') return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === '\\') j++;
    else if (s[j] === '{') depth++;
    else if (s[j] === '}' && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return null;
}

class Unspeakable extends Error {}

function say(tex: string, L: (typeof WORDS)[Lang], lang: Lang, depth = 0): string {
  if (depth > 6) throw new Unspeakable();
  let out = '';
  let i = 0;
  const arg = (): string => {
    while (tex[i] === ' ') i++;
    if (tex[i] === '{') {
      const g = group(tex, i);
      if (!g) throw new Unspeakable();
      i = g[1];
      return say(g[0], L, lang, depth + 1);
    }
    if (tex[i] === '\\') return ''; // handled by caller loop
    const ch = tex[i++] ?? '';
    return ch;
  };
  while (i < tex.length) {
    const c = tex[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+|.)/.exec(tex.slice(i));
      if (!m) throw new Unspeakable();
      const cmd = m[1];
      i += m[0].length;
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac') {
        const a = arg();
        const b = arg();
        out += ` ${a} ${L.over} ${b} `;
      } else if (cmd === 'sqrt') {
        if (tex[i] === '[') throw new Unspeakable();
        out += ` ${L.root} ${arg()} `;
      } else if (cmd === 'left' || cmd === 'right' || cmd === 'displaystyle' || cmd === 'mathrm' || cmd === 'mathbf' || cmd === 'operatorname' || cmd === 'text') {
        if (cmd === 'text' || cmd === 'mathrm' || cmd === 'mathbf' || cmd === 'operatorname') out += ` ${arg()} `;
        if (cmd === 'left' || cmd === 'right') i += tex[i] === '.' ? 1 : 0;
      } else if (cmd === 'cdot' || cmd === 'times') out += ` ${L.times} `;
      else if (cmd === 'pm') out += ` ${L.pm} `;
      else if (cmd === 'to' || cmd === 'rightarrow') out += ` ${L.to} `;
      else if (cmd === 'infty') out += ` ${L.inf} `;
      else if (cmd === 'int') out += ` ${L.int} `;
      else if (cmd === 'sum') out += ` ${L.sum} `;
      else if (cmd === 'lim') out += ` ${L.lim} `;
      else if (cmd === 'le' || cmd === 'leq') out += ` ${L.le} `;
      else if (cmd === 'ge' || cmd === 'geq') out += ` ${L.ge} `;
      else if (cmd === 'ne' || cmd === 'neq') out += ` ${L.ne} `;
      else if (cmd === 'theta') out += ` ${L.theta} `;
      else if (cmd === 'circ') out += ` ${L.deg} `;
      else if (cmd === ',' || cmd === ';' || cmd === '!' || cmd === ':' || cmd === ' ' || cmd === 'quad' || cmd === 'qquad') out += ' ';
      else if (cmd in SIMPLE_CMDS) out += ` ${SIMPLE_CMDS[cmd]} `;
      else if (cmd === '{' || cmd === '}' || cmd === '%') out += cmd === '%' ? ' persen ' : '';
      else throw new Unspeakable();
      continue;
    }
    if (c === '^') {
      i++;
      const e = arg().trim();
      out += e === '2' ? ` ${L.sq} ` : e === '3' ? ` ${L.cube} ` : ` ${L.pow} ${e} `;
      continue;
    }
    if (c === '_') {
      i++;
      out += ` ${L.sub} ${arg()} `;
      continue;
    }
    i++;
    if (c === '{' || c === '}') continue;
    if (c === '=') out += ` ${L.eq} `;
    else if (c === '+') out += ` ${L.plus} `;
    else if (c === '-') out += ` ${L.minus} `;
    else if (c === '/') out += ` ${L.over} `;
    else if (c === '<') out += ` ${L.lt} `;
    else if (c === '>') out += ` ${L.gt} `;
    else if (c === "'") out += lang === 'id' ? ' aksen ' : ' prime ';
    else if (c === '(' || c === ')' || c === ',' || c === '|' || c === '[' || c === ']') out += ` ${c === ',' ? ',' : ''} `;
    else if (/[\p{L}\p{N}.\s]/u.test(c)) out += c;
    else throw new Unspeakable();
  }
  return out.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim();
}

/** Spoken form of one formula, or the word for "formula" when it cannot be read reliably. */
export function speakTex(tex: string, lang: Lang = 'id'): string {
  const L = WORDS[lang];
  try {
    return say(tex, L, lang) || L.formula;
  } catch {
    return L.formula;
  }
}

/** Plain text for text-to-speech: every math segment replaced by words, escapes resolved. */
export function speakable(text: string, lang: Lang = 'id'): string {
  return splitMath(text)
    .map((s) => (s.t === 'text' ? s.v : ` ${speakTex(s.v, lang)} `))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One sentence appended to every prompt whose output the learner reads. The renderer supports exactly this. */
export const MATH_FORMAT_NOTE =
  String.raw`Write every formula inside $...$ using LaTeX, in every text field including captions (for example $\frac{\pi}{4}$, $x^2$ or $f(x)=\sin(x)$), with no other markup. In JSON, write each backslash twice.`;
