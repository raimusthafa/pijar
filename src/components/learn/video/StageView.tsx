'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayableScene } from '@/lib/learn/scene-dsl';
import { readStageTheme } from './stage-theme';
import type { StageEngine } from './stage-engine';

/** Below this stage width (px) the frame is rebuilt with larger type and without low-priority notes. */
export const COMPACT_BELOW = 560;

export type StageStatus = 'loading' | 'ready' | 'unsupported';

interface Props {
  scene: PlayableScene;
  /** Seconds this scene runs (after adapting to the narration). */
  runtime: number;
  /** Seconds since the start of this scene. */
  time: number;
  onStatus?: (s: StageStatus) => void;
  /** Fires when the stage crosses the narrow threshold (phones). */
  onCompact?: (compact: boolean) => void;
  className?: string;
  /** Shown when WebGL is missing or the engine failed. */
  fallback?: React.ReactNode;
}

/**
 * One WebGL stage for the whole player. The engine is created once and reused for every scene,
 * and disposed (renderer, textures, canvas) when the component unmounts.
 */
export default function StageView({ scene, runtime, time, onStatus, onCompact, className, fallback }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const [status, setStatus] = useState<StageStatus>('loading');
  const [engineReady, setEngineReady] = useState(false);
  const [compact, setCompact] = useState(false);
  const compactCb = useRef(onCompact);
  useEffect(() => {
    compactCb.current = onCompact;
  });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const c = e.contentRect.width > 0 && e.contentRect.width < COMPACT_BELOW;
      setCompact(c);
      compactCb.current?.(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const timeRef = useRef(time);
  useEffect(() => {
    timeRef.current = time;
  });
  const statusCb = useRef(onStatus);
  useEffect(() => {
    statusCb.current = onStatus;
  });

  const update = (s: StageStatus) => {
    setStatus(s);
    statusCb.current?.(s);
  };

  useEffect(() => {
    let cancelled = false;
    let engine: StageEngine | null = null;
    (async () => {
      try {
        const mod = await import('./stage-engine');
        if (cancelled || !host.current) return;
        if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
        if (cancelled || !host.current) return;
        engine = mod.StageEngine.create(host.current, readStageTheme());
        engineRef.current = engine;
        setEngineReady(true);
      } catch (err) {
        console.warn('[stage] engine unavailable', err);
        if (!cancelled) update('unsupported');
      }
    })();
    return () => {
      cancelled = true;
      engineRef.current = null;
      engine?.dispose();
      setEngineReady(false);
    };
  }, []);

  // Load a scene whenever it (or its runtime) changes.
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engineReady) return;
    let live = true;
    engine
      .load(scene.stage, runtime / scene.durationSeconds, compact)
      .then(() => live && update('ready'))
      .catch((err) => {
        console.warn('[stage] load failed', err);
        if (live) update('unsupported');
      });
    return () => {
      live = false;
    };
  }, [engineReady, scene, runtime, compact]);

  useEffect(() => {
    engineRef.current?.seek(time);
  }, [time]);

  return (
    <div className={className}>
      <div ref={host} className="absolute inset-0" role="img" aria-label={scene.title} hidden={status === 'unsupported'} />
      {status === 'unsupported' ? fallback : null}
    </div>
  );
}
