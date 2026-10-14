import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitMath, speakable, speakTex, hasMath } from '../src/lib/learn/math-text.ts';

// String.raw keeps LaTeX backslashes readable.
const r = String.raw;
const math = (s) => splitMath(s).filter((x) => x.t === 'math');
const joined = (s) => splitMath(s).map((x) => (x.t === 'text' ? x.v : `[${x.display ? 'D' : 'I'}:${x.v}]`)).join('');

describe('math-text: splitMath', () => {
  it('splits inline math from prose', () => {
    assert.equal(joined(r`Tentukan gradien $y = \sin x + \cos x$ di $x=\frac{\pi}{4}$.`), r`Tentukan gradien [I:y = \sin x + \cos x] di [I:x=\frac{\pi}{4}].`);
    assert.equal(joined(r`$\sqrt{2}$`), r`[I:\sqrt{2}]`);
  });
  it('handles display math in both syntaxes', () => {
    assert.equal(joined('a $$x^2$$ b'), 'a [D:x^2] b');
    assert.equal(joined(r`a \[x^2\] b \(y\)`), 'a [D:x^2] b [I:y]');
    assert.equal(joined('$$\n x \n$$'), '[D:x]');
  });
  it('keeps unmatched dollars and prices as prose', () => {
    for (const s of ['Rp 5$ saja', 'Harga $5 dan $10 murah', 'cuma $ satu', 'lonely $x', 'kosong $$ nih', 'Rp 5$ dan 10$']) {
      assert.deepEqual(math(s), [], s);
      assert.equal(splitMath(s).map((x) => x.v).join(''), s);
    }
  });
  it('rejects padded or digit-trailed single dollars', () => {
    assert.deepEqual(math('$ x $'), []);
    assert.deepEqual(math('$x$5'), []);
  });
  it('supports nested braces and escaped characters', () => {
    assert.equal(joined(r`$\frac{a^{2}}{\sqrt{b}}$`), r`[I:\frac{a^{2}}{\sqrt{b}}]`);
    assert.equal(joined(r`Bayar \$5 lalu $x$`), 'Bayar $5 lalu [I:x]');
    assert.equal(joined(r`$a \$ b$`), r`[I:a \$ b]`);
    assert.equal(joined(r`$\{x\}$`), r`[I:\{x\}]`);
  });
  it('repairs control characters from unescaped JSON (form feed, tab, backspace)', () => {
    assert.equal(math('$\x0crac{1}{2} + \times$')[0].v, r`\frac{1}{2} + \times`);
    assert.equal(math('$\x08eta$')[0].v, r`\beta`);
  });
  it('hasMath', () => {
    assert.equal(hasMath('a $x$'), true);
    assert.equal(hasMath('Rp 5$'), false);
  });
});

describe('math-text: speakable', () => {
  it('reads common formulas in Indonesian', () => {
    assert.equal(speakTex(r`\frac{\pi}{4}`), 'pi per 4');
    assert.equal(speakTex('x^2'), 'x kuadrat');
    assert.equal(speakTex('x^{10}'), 'x pangkat 10');
    assert.equal(speakTex(r`\sqrt{2}`), 'akar 2');
    assert.equal(speakTex(r`y = \sin x + \cos x`), 'y sama dengan sin x tambah cos x');
    assert.equal(speakTex(r`\frac{1}{2}`, 'en'), '1 over 2');
  });
  it('falls back to "rumus" for anything it cannot read', () => {
    assert.equal(speakTex(r`\begin{matrix}a\end{matrix}`), 'rumus');
    assert.equal(speakTex(r`\sqrt[3]{x}`), 'rumus');
    assert.equal(speakTex(r`\frac{1`), 'rumus');
  });
  it('replaces math inside a sentence and never leaks LaTeX', () => {
    const out = speakable(r`Gradien $y=\sin x$ di $x=\frac{\pi}{4}$ adalah $\sqrt{2}/2$.`);
    assert.equal(out, 'Gradien y sama dengan sin x di x sama dengan pi per 4 adalah akar 2 per 2 .');
    assert.ok(!/[\\${}^]/.test(out));
    assert.equal(speakable('Rp 5$ saja'), 'Rp 5$ saja');
  });
});

describe('math-text: bare TeX answer options', () => {
  it('typesets a delimiter-less formula but leaves prose alone', () => {
    assert.equal(joined(r`a \times b \times c`), r`[I:a \times b \times c]`);
    assert.equal(joined(r`3x \times 15`), r`[I:3x \times 15]`);
    assert.equal(joined(r`Kalikan dengan \times saja`), r`Kalikan dengan \times saja`);
    assert.equal(joined('ab + ac'), 'ab + ac');
  });
});
