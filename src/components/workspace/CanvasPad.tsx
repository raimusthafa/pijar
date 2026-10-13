'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, Trash2, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import { canvasToDataUrl } from '@/lib/workspace/client';
import { midpoint } from './logic';

type Pt = { x: number; y: number }; // normalised by canvas CSS width, so strokes survive resizing
type Stroke = { pts: Pt[]; erase: boolean; w: number };

// Base nib width per pointer type, in CSS px.
const NIB = { pen: 2.5, touch: 3.5, mouse: 3 } as const;
const ERASER = 20;

/**
 * Plain canvas drawing pad. Pointer Events with capture, coalesced samples, quadratic curves between
 * midpoints. The eraser paints the paper color so the exported PNG stays opaque.
 */
export function CanvasPad({ onExport, busy }: { onExport: (dataUrl: string) => void; busy?: boolean }) {
  const { t } = useT();
  const ref = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const live = useRef<{ id: number; s: Stroke } | null>(null);
  const colors = useRef({ ink: '#242d3a', paper: '#ffffff' });
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [count, setCount] = useState(0);

  const css = () => {
    const c = ref.current!;
    return { w: c.clientWidth, dpr: c.width / Math.max(c.clientWidth, 1) };
  };

  // Draw points [from..] of a stroke as quadratic curves through midpoints.
  const paint = useCallback((s: Stroke, from: number, closing: boolean) => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const { w, dpr } = css();
    const k = w * dpr;
    const p = s.pts;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ctx.fillStyle = s.erase ? colors.current.paper : colors.current.ink;
    ctx.lineWidth = s.w * dpr;
    if (p.length === 1) {
      ctx.beginPath();
      ctx.arc(p[0].x * k, p[0].y * k, (s.w * dpr) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    for (let i = Math.max(from, 1); i < p.length; i++) {
      const start = i === 1 ? p[0] : midpoint(p[i - 2], p[i - 1]);
      const end = closing && i === p.length - 1 ? p[i] : midpoint(p[i - 1], p[i]);
      ctx.beginPath();
      ctx.moveTo(start.x * k, start.y * k);
      ctx.quadraticCurveTo(p[i - 1].x * k, p[i - 1].y * k, end.x * k, end.y * k);
      ctx.stroke();
    }
  }, []);

  const redraw = useCallback(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.fillStyle = colors.current.paper;
    ctx.fillRect(0, 0, c.width, c.height);
    strokes.current.forEach((s) => paint(s, 1, true));
  }, [paint]);

  // Keep the backing store crisp: CSS size times devicePixelRatio, redrawn when the box changes.
  useEffect(() => {
    const c = ref.current!;
    const st = getComputedStyle(document.documentElement);
    colors.current = {
      ink: st.getPropertyValue('--pj-ink').trim() || '#242d3a',
      paper: st.getPropertyValue('--pj-raised').trim() || '#ffffff',
    };
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (!w || (c.width === w && c.height === h)) return;
      c.width = w;
      c.height = h;
      redraw();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    return () => ro.disconnect();
  }, [redraw]);

  const toPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = ref.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.width };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (live.current || (e.pointerType === 'mouse' && e.button !== 0)) return; // one pointer at a time
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const erase = tool === 'eraser';
    const nib = NIB[e.pointerType as keyof typeof NIB] ?? NIB.mouse;
    const s: Stroke = { pts: [toPt(e)], erase, w: erase ? ERASER : nib };
    live.current = { id: e.pointerId, s };
    paint(s, 1, false);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    const from = l.s.pts.length;
    (events.length ? events : [e.nativeEvent]).forEach((ev) => l.s.pts.push(toPt(ev)));
    paint(l.s, from, false);
  };

  const up = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const l = live.current;
    if (!l || l.id !== e.pointerId) return;
    live.current = null;
    if (l.s.pts.length > 1) paint(l.s, l.s.pts.length - 1, true);
    strokes.current.push(l.s);
    setCount(strokes.current.length);
  };

  const undo = () => {
    strokes.current.pop();
    setCount(strokes.current.length);
    redraw();
  };
  const clear = () => {
    strokes.current = [];
    setCount(0);
    redraw();
  };

  const toggle = (v: 'pen' | 'eraser') => (tool === v ? 'border-foreground bg-surface' : '');

  return (
    <div className="flex flex-col gap-3">
      <div role="toolbar" aria-label={t('workspace.canvas.title')} className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" aria-pressed={tool === 'pen'} className={toggle('pen')} onClick={() => setTool('pen')}>
          <PenLine strokeWidth={1.75} />
          {t('workspace.canvas.pen')}
        </Button>
        <Button variant="secondary" size="sm" aria-pressed={tool === 'eraser'} className={toggle('eraser')} onClick={() => setTool('eraser')}>
          <Eraser strokeWidth={1.75} />
          {t('workspace.canvas.eraser')}
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-hairline-strong sm:block" aria-hidden />
        <Button variant="ghost" size="sm" onClick={undo} disabled={!count}>
          <Undo2 strokeWidth={1.75} />
          {t('workspace.canvas.undo')}
        </Button>
        <Button variant="ghost" size="sm" onClick={clear} disabled={!count}>
          <Trash2 strokeWidth={1.75} />
          {t('workspace.canvas.clear')}
        </Button>
      </div>

      <canvas
        ref={ref}
        role="img"
        aria-label={t('workspace.canvas.surface')}
        data-testid="canvas-pad"
        className="aspect-[4/3] max-h-[55dvh] w-full cursor-crosshair touch-none rounded-inner border border-field bg-raised"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />

      <div className="flex items-center justify-end gap-3">
        {!count && <p className="text-xs text-muted-foreground">{t('workspace.canvas.empty')}</p>}
        <Button disabled={!count || busy} onClick={() => onExport(canvasToDataUrl(ref.current!, 1024))}>
          {t('workspace.canvas.use')}
        </Button>
      </div>
    </div>
  );
}
