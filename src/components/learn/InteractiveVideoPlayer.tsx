'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Captions, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { VideoScriptPlan } from '@/lib/learn/types';
import { normalizeVideoScript } from '@/lib/learn/scene-normalize';
import { runtimeSeconds } from '@/lib/learn/scene-dsl';
import { MathText } from '@/components/ui/math-text';
import { VideoNarrationController, probeAudioCapability } from '@/lib/learn/audio';
import type { StageStatus } from './video/StageView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';

// The stage pulls in three.js and manim-web: client only, loaded on demand.
const StageView = dynamic(() => import('./video/StageView'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-action" aria-hidden />,
});

interface InteractiveVideoPlayerProps {
  script: VideoScriptPlan;
  onFinished?: () => void;
}

const SPEEDS = [1, 1.25, 1.5];
const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const;

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return r;
}

const formatTime = (secs: number) => {
  const s = Math.floor(secs);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function InteractiveVideoPlayer({ script, onFinished }: InteractiveVideoPlayerProps) {
  const { t, locale } = useT();
  const playable = useMemo(() => normalizeVideoScript(script, locale === 'en' ? 'en' : 'id'), [script, locale]);
  const scenes = playable.scenes;
  // Each scene runs as long as its narration needs, so voice and animation end together.
  const runtimes = useMemo(() => scenes.map(s => runtimeSeconds(s, locale === 'en' ? 'en' : 'id')), [scenes, locale]);
  const totalDuration = runtimes.reduce((a, r) => a + r, 0) || 45;
  const reducedMotion = useReducedMotion();
  const [compact, setCompact] = useState(false);
  const [stageStatus, setStageStatus] = useState<StageStatus>('loading');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Voices only exist in the browser, so the first (server-matching) render has none and the effect below fills them in.
  const [audioCap, setAudioCap] = useState<ReturnType<typeof probeAudioCapability> | null>(null);
  const [seekTick, setSeekTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const narrationRef = useRef<VideoNarrationController | null>(null);
  const lastSpokenRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const speedRef = useRef(1);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
    speedRef.current = speed;
  });

  const setTime = useCallback((v: number) => {
    timeRef.current = v;
    setCurrentTime(v);
  }, []);

  // Narration controller follows the interface language.
  useEffect(() => {
    const controller = new VideoNarrationController(locale);
    narrationRef.current = controller;
    const speech = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    const probe = () => setAudioCap(probeAudioCapability(locale));
    probe();
    if (speech) speech.onvoiceschanged = probe;
    return () => {
      controller.stop();
      if (speech) speech.onvoiceschanged = null;
    };
  }, [locale]);

  useEffect(() => {
    narrationRef.current?.setMuted(isMuted);
    narrationRef.current?.setRate(speed);
  }, [isMuted, speed, audioCap]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const sceneOffsets = useMemo(
    () =>
      scenes.map((s, i) => {
        const start = runtimes.slice(0, i).reduce((a, x) => a + x, 0);
        return { id: s.id, start, end: start + runtimes[i], scene: s, runtime: runtimes[i] };
      }),
    [scenes, runtimes],
  );

  const current = sceneOffsets.find(so => currentTime >= so.start && currentTime < so.end) ?? sceneOffsets[sceneOffsets.length - 1] ?? null;
  const activeScene = current?.scene ?? scenes[0];
  const activeIndex = Math.max(0, scenes.findIndex(s => s.id === activeScene?.id));

  // Paused at the start of a scene (first load, scene jump, restart) and reduced motion show the finished
  // frame as a poster, so the stage is never an empty dark box. Pressing play animates from the start.
  const rawLocal = current ? Math.max(0, currentTime - current.start) : 0;
  const poster = reducedMotion || (!isPlaying && rawLocal < 0.05);
  const localTime = current ? (poster ? current.runtime : Math.min(current.runtime, rawLocal)) : 0;

  const caption = showCaptions && activeScene && current
    ? activeScene.captions.find(c => {
        const k = current.runtime / activeScene.durationSeconds;
        const e = localTime / k;
        return e >= c.startSeconds && e <= c.endSeconds;
      })?.text
    : undefined;

  const stopSpeech = useCallback(() => narrationRef.current?.stop(), []);

  // Playback clock.
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const next = timeRef.current + ((now - last) / 1000) * speedRef.current;
      last = now;
      if (next >= totalDuration) {
        setTime(totalDuration);
        setIsPlaying(false);
        narrationRef.current?.stop();
        onFinishedRef.current?.();
        return;
      }
      setTime(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, totalDuration, setTime]);

  // Speak a scene when playback enters it (or after a seek or resume).
  useEffect(() => {
    if (!isPlaying || lastSpokenRef.current === activeIndex) return;
    lastSpokenRef.current = activeIndex;
    if (scenes[activeIndex]?.narration) narrationRef.current?.speak(scenes[activeIndex].narration);
  }, [isPlaying, activeIndex, seekTick, scenes]);

  const togglePlay = () => {
    if (isPlaying) {
      stopSpeech();
      lastSpokenRef.current = null;
      setIsPlaying(false);
      return;
    }
    if (timeRef.current >= totalDuration) setTime(0);
    lastSpokenRef.current = null;
    setIsPlaying(true);
  };

  const seek = (v: number, commit = true) => {
    setTime(Math.max(0, Math.min(v, totalDuration)));
    if (commit) {
      stopSpeech();
      lastSpokenRef.current = null;
      setSeekTick(n => n + 1);
    }
  };
  const jumpScene = (i: number) => sceneOffsets[i] && seek(sceneOffsets[i].start);

  const seekFromPointer = (e: React.PointerEvent<HTMLDivElement>, commit: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * totalDuration, commit);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else containerRef.current?.requestFullscreen().catch(() => {});
  };

  const voiceLabel = !audioCap
    ? null
    : audioCap.hasIndonesianVoice
      ? t('learn.player.voice.native')
      : audioCap.hasSpeechSynthesis
        ? t('learn.player.voice.fallback')
        : t('learn.player.voice.none');

  const iconBtn = 'text-foreground';

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col overflow-hidden border border-hairline bg-surface',
        isFullscreen ? 'h-dvh rounded-none' : 'rounded-card',
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-hairline bg-raised px-5 py-3">
        <p className="min-w-0 flex-1 basis-48 text-sm font-medium">{playable.title}</p>
        {voiceLabel && <Badge variant="outline">{voiceLabel}</Badge>}
      </div>

      <div className="bg-action">
        <div className="relative mx-auto aspect-video max-h-[70dvh] w-full cursor-pointer" onClick={togglePlay}>
          {activeScene && current && (
            <StageView
              scene={activeScene}
              runtime={current.runtime}
              time={localTime}
              onStatus={setStageStatus}
              onCompact={setCompact}
              className="absolute inset-0"
              fallback={
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center text-action-foreground">
                  <p className="font-display text-h4">{activeScene.title}</p>
                  <p className="max-w-xl text-sm text-action-foreground/80">{activeScene.narration}</p>
                  <p className="text-xs text-action-foreground/70">{t('learn.player.stage.unsupported')}</p>
                </div>
              }
            />
          )}
          {stageStatus === 'loading' && (
            <div className="pj-skeleton pointer-events-none absolute inset-0 bg-action" aria-hidden />
          )}
          {/* A paused stage looks like a picture, so say it plays. The Play button below stays the keyboard route. */}
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out',
              isPlaying || stageStatus !== 'ready' ? 'opacity-0' : 'opacity-100',
            )}
          >
            <span className="flex size-16 items-center justify-center rounded-pill bg-raised text-foreground">
              <Play {...ICON} className="size-6 translate-x-0.5 fill-current" />
            </span>
          </span>
        </div>
        <div className="flex min-h-14 w-full items-center justify-center px-4 pb-3 pt-1 md:px-8" aria-live="off">
          {caption && <p className="max-w-2xl text-center text-sm leading-relaxed text-action-foreground"><MathText text={caption} /></p>}
        </div>
        <div className="empty:hidden px-4 pb-3 text-center text-sm text-action-foreground/70">
          {compact && activeScene?.stage.objects.map((o) => (o.type === 'text' && o.priority === 'low' ? <p key={o.id}>{o.text}</p> : null))}
        </div>
      </div>

      <div className="space-y-2 border-t border-hairline bg-raised px-4 pt-3 pb-4 md:px-5">
        <div
          role="slider"
          tabIndex={0}
          aria-label={t('learn.player.timeline')}
          aria-valuemin={0}
          aria-valuemax={Math.round(totalDuration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} / ${formatTime(totalDuration)}`}
          className="group relative flex h-6 cursor-pointer touch-none items-center"
          onPointerDown={e => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromPointer(e, false);
          }}
          onPointerMove={e => e.buttons && seekFromPointer(e, false)}
          onPointerUp={e => seekFromPointer(e, true)}
          onKeyDown={e => {
            const step = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
            if (step) {
              e.preventDefault();
              seek(timeRef.current + step);
            } else if (e.key === 'Home') seek(0);
            else if (e.key === 'End') seek(totalDuration);
          }}
        >
          <div className="relative h-1.5 w-full overflow-hidden rounded-pill bg-surface-strong">
            <div className="h-full bg-amber" style={{ width: `${(currentTime / totalDuration) * 100}%` }} />
            {sceneOffsets.slice(1).map(so => (
              <span
                key={so.id}
                aria-hidden
                className="absolute inset-y-0 w-0.5 bg-raised"
                style={{ left: `${(so.start / totalDuration) * 100}%` }}
              />
            ))}
          </div>
          <span
            aria-hidden
            className="absolute size-3.5 -translate-x-1/2 rounded-pill border-2 border-raised bg-foreground"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex items-center gap-1">
            <Button size="icon" onClick={togglePlay} aria-label={isPlaying ? t('learn.player.pause') : t('learn.player.play')}>
              {isPlaying ? <Pause {...ICON} className="fill-current" /> : <Play {...ICON} className="fill-current" />}
            </Button>
            <Button variant="ghost" size="icon-sm" className={iconBtn} onClick={() => seek(0)} aria-label={t('learn.player.restart')}>
              <RotateCcw {...ICON} />
            </Button>
            <Button variant="ghost" size="icon-sm" className={cn(iconBtn, 'max-sm:hidden')} disabled={activeIndex <= 0} onClick={() => jumpScene(activeIndex - 1)} aria-label={t('learn.player.prev')}>
              <ChevronLeft {...ICON} />
            </Button>
            <Button variant="ghost" size="icon-sm" className={cn(iconBtn, 'max-sm:hidden')} disabled={activeIndex >= scenes.length - 1} onClick={() => jumpScene(activeIndex + 1)} aria-label={t('learn.player.next')}>
              <ChevronRight {...ICON} />
            </Button>
            <span className="ml-2 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="tabular-nums"
              aria-label={t('learn.player.speed', { s: speed })}
              onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
            >
              {speed}x
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(iconBtn, showCaptions && 'bg-surface-strong')}
              aria-pressed={showCaptions}
              aria-label={t('learn.player.captions')}
              onClick={() => setShowCaptions(v => !v)}
            >
              <Captions {...ICON} />
            </Button>
            <Button variant="ghost" size="icon-sm" className={iconBtn} aria-pressed={isMuted} aria-label={isMuted ? t('learn.player.unmute') : t('learn.player.mute')} onClick={() => setIsMuted(v => !v)}>
              {isMuted ? <VolumeX {...ICON} /> : <Volume2 {...ICON} />}
            </Button>
            <Button variant="ghost" size="icon-sm" className={iconBtn} aria-label={isFullscreen ? t('learn.player.exitFullscreen') : t('learn.player.fullscreen')} onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 {...ICON} /> : <Maximize2 {...ICON} />}
            </Button>
          </div>
        </div>

        <ul className="flex gap-2 overflow-x-auto pt-1" aria-label={t('learn.player.scenes')}>
          {scenes.map((s, i) => (
            <li key={s.id} className="shrink-0">
              <button
                type="button"
                onClick={() => jumpScene(i)}
                aria-current={i === activeIndex ? 'true' : undefined}
                aria-label={t('learn.player.scene', { n: i + 1, title: s.title })}
                className={cn(
                  'pj-press h-11 max-w-56 truncate rounded-pill border px-4 text-sm transition-colors duration-150 md:h-8',
                  i === activeIndex
                    ? 'border-transparent bg-action text-action-foreground'
                    : 'border-hairline-strong text-foreground hover:bg-hover',
                )}
              >
                {i + 1}. {s.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
