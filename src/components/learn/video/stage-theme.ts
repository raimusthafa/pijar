import type { StageColor } from '@/lib/learn/scene-dsl';

/** Resolved hex colors for the dark explainer stage. Read from the design tokens at runtime. */
export interface StageTheme {
  bg: string;
  /** Slightly lighter than bg: fills for boxes so lines behind them are hidden. */
  panel: string;
  colors: Record<StageColor, string>;
  /** Text drawn on top of an amber fill. */
  onAmber: string;
  fontBody: string;
  fontMono: string;
}

// Only used when a token is missing (rgb, so no color literal lives in components).
const FALLBACK = { ink: 'rgb(36 45 58)', amber: 'rgb(217 166 72)', ground: 'rgb(251 250 247)', success: 'rgb(47 125 79)', danger: 'rgb(192 57 47)' };

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
}

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Mix a over b by t (0 = b, 1 = a). */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  return toHex(br + (ar - br) * t, bg + (ag - bg) * t, bb + (ab - bb) * t);
}

/** Resolve a CSS custom property to #rrggbb using the browser's own color parsing. */
function cssVarHex(name: string, fallback: string): string {
  if (typeof document === 'undefined') return toHex(127, 127, 127);
  const probe = document.createElement('span');
  probe.style.color = `var(${name}, ${fallback})`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(rgb);
  return m ? toHex(+m[1], +m[2], +m[3]) : toHex(127, 127, 127);
}

export function readStageTheme(): StageTheme {
  const ink = cssVarHex('--pj-ink', FALLBACK.ink);
  const amber = cssVarHex('--pj-amber', FALLBACK.amber);
  const ground = cssVarHex('--pj-ground', FALLBACK.ground);
  const success = cssVarHex('--pj-success', FALLBACK.success);
  const danger = cssVarHex('--pj-danger', FALLBACK.danger);
  const bodyFont = typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily : '';
  return {
    bg: ink,
    panel: mix(ground, ink, 0.07),
    colors: {
      ink: mix(ground, ink, 0.12),
      amber,
      'off-white': ground,
      // Muted text on the dark stage: ground pulled toward ink.
      muted: mix(ground, ink, 0.58),
      // The status colors are too dark on ink, so they are lifted toward the ground tone.
      success: mix(ground, success, 0.42),
      danger: mix(ground, danger, 0.4),
    },
    onAmber: ink,
    fontBody: bodyFont || 'system-ui, sans-serif',
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  };
}
