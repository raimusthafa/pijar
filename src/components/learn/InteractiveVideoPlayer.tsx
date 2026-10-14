'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Captions, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import dynamic from 'next/dynamic';
import type { VideoScriptPlan } from '@/lib/learn/types';
import { normalizeVideoScript } from '@/lib/learn/scene-normalize';
import { runtimeSeconds } from '@/lib/learn/scene-dsl';
import { distributeCaptions } from '@/lib/learn/captions';
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

interface TtsCacheEntry {
  url: string;
  duration: number;
  isAi: boolean;
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

async function fetchNarrationApi(text: string, language: string, fallbackDuration: number): Promise<TtsCacheEntry> {
  try {
    const res = await fetch('/api/learn/narration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url && typeof data.durationSeconds === 'number') {
        return {
          url: data.url,
          duration: data.durationSeconds,
          isAi: true,
        };
      }
    }
  } catch (err) {
    console.warn('Narration fetch fallback:', err);
  }
  return { url: '', duration: fallbackDuration, isAi: false };
}

export function InteractiveVideoPlayer({ script, onFinished }: InteractiveVideoPlayerProps) {
  const { t, locale } = useT();
  const playable = useMemo(() => normalizeVideoScript(script, locale === 'en' ? 'en' : 'id'), [script, locale]);
  const scenes = playable.scenes;

  const [ttsMap, setTtsMap] = useState<Record<string, TtsCacheEntry>>({});

  // Each scene runs as long as its narration audio needs (+0.4s pause), or the fallback estimate
  const runtimes = useMemo(() => {
    return scenes.map((s) => {
      const cached = ttsMap[s.id];
      if (cached?.isAi && cached.duration > 0) {
        return Number((cached.duration + 0.4).toFixed(2));
      }
      return runtimeSeconds(s, locale === 'en' ? 'en' : 'id');
    });
  }, [scenes, locale, ttsMap]);

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
  const [audioCap, setAudioCap] = useState<ReturnType<typeof probeAudioCapability> | null>(null);
  const [seekTick, setSeekTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const narrationRef = useRef<VideoNarrationController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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

  // Initialize audio element for AI voice playback
  useEffect(() => {
    const audio = new Audio();
    audio.preservesPitch = true;
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  // Fallback Web Speech narration controller
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
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.playbackRate = speed;
      audioRef.current.preservesPitch = true;
    }
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

  const current = sceneOffsets.find((so) => currentTime >= so.start && currentTime < so.end) ?? sceneOffsets[sceneOffsets.length - 1] ?? null;
  const activeScene = current?.scene ?? scenes[0];
  const activeIndex = Math.max(0, scenes.findIndex((s) => s.id === activeScene?.id));

  // Paused at the start of a scene (first load, scene jump, restart) and reduced motion show the finished
  // frame as a poster, so the stage is never an empty dark box. Pressing play animates from the start.
  const rawLocal = current ? Math.max(0, currentTime - current.start) : 0;
  const poster = reducedMotion || (!isPlaying && rawLocal < 0.05);
  const localTime = current ? (poster ? current.runtime : Math.min(current.runtime, rawLocal)) : 0;

  const activeNarration = activeScene?.narration ?? '';
  const activeRuntime = current?.runtime ?? 0;

  // Subtitles: derived directly from narration text and matched to the actual runtime
  const distributedCaptions = useMemo(() => {
    if (!activeNarration || activeRuntime <= 0) return [];
    return distributeCaptions(activeNarration, activeRuntime);
  }, [activeNarration, activeRuntime]);

  const caption = showCaptions && distributedCaptions.length > 0
    ? distributedCaptions.find((c) => localTime >= c.startSeconds && localTime <= c.endSeconds)?.text
    : undefined;

  const stopSpeech = useCallback(() => {
    audioRef.current?.pause();
    narrationRef.current?.stop();
  }, []);

  // Prefetch active and next scene narration only after playback begins
  useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;

    const load = async () => {
      const curr = scenes[activeIndex];
      const lang = locale === 'en' ? 'en' : 'id';
      if (curr && !ttsMap[curr.id]) {
        const est = runtimeSeconds(curr, lang);
        const entry = await fetchNarrationApi(curr.narration, lang, est);
        if (!cancelled) {
          setTtsMap((prev) => ({ ...prev, [curr.id]: entry }));
        }
      }
      const next = scenes[activeIndex + 1];
      if (next && !ttsMap[next.id]) {
        const est = runtimeSeconds(next, lang);
        const entry = await fetchNarrationApi(next.narration, lang, est);
        if (!cancelled) {
          setTtsMap((prev) => ({ ...prev, [next.id]: entry }));
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isPlaying, activeIndex, scenes, locale, ttsMap]);

  // Audio synchronization with active scene
  useEffect(() => {
    if (!isPlaying || !activeScene) return;
    const audio = audioRef.current;
    const cached = ttsMap[activeScene.id];

    if (cached?.isAi && cached.url && audio) {
      narrationRef.current?.stop();
      if (audio.src !== cached.url) {
        audio.src = cached.url;
        audio.currentTime = Math.max(0, Math.min(rawLocal, cached.duration));
      }
      audio.playbackRate = speed;
      audio.preservesPitch = true;
      audio.muted = isMuted;
      audio.play().catch(() => {});
    } else {
      if (audio && !audio.paused) {
        audio.pause();
      }
      if (lastSpokenRef.current !== activeIndex) {
        lastSpokenRef.current = activeIndex;
        if (activeScene.narration) {
          narrationRef.current?.speak(activeScene.narration);
        }
      }
    }
  }, [isPlaying, activeIndex, seekTick, activeScene, rawLocal, speed, isMuted, ttsMap]);

  // Playback clock: follows audio.currentTime when AI audio plays, else requestAnimationFrame delta
  useEffect(() => {
    if (!isPlaying) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const audio = audioRef.current;
      const cached = activeScene ? ttsMap[activeScene.id] : null;
      const hasAiAudio = Boolean(cached?.isAi && cached?.url && audio && !audio.paused && !audio.ended);

      let next: number;
      if (hasAiAudio && current) {
        const audioTime = audio?.currentTime ?? 0;
        next = current.start + Math.min(current.runtime, audioTime);
        if (audio?.ended || audioTime >= (cached?.duration ?? current.runtime)) {
          next = current.end;
        }
      } else {
        next = timeRef.current + ((now - last) / 1000) * speedRef.current;
      }
      last = now;

      if (next >= totalDuration) {
        setTime(totalDuration);
        setIsPlaying(false);
        if (audio) audio.pause();
        narrationRef.current?.stop();
        onFinishedRef.current?.();
        return;
      }

      setTime(next);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, totalDuration, setTime, activeScene, current, ttsMap]);

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
    const clamped = Math.max(0, Math.min(v, totalDuration));
    setTime(clamped);
    if (commit) {
      stopSpeech();
      lastSpokenRef.current = null;
      if (audioRef.current && current) {
        const targetLocal = Math.max(0, clamped - current.start);
        const cached = activeScene ? ttsMap[activeScene.id] : null;
        if (cached?.isAi) {
          audioRef.current.currentTime = Math.max(0, Math.min(targetLocal, cached.duration));
        }
      }
      setSeekTick((n) => n + 1);
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

  const isAiVoice = Boolean(activeScene && ttsMap[activeScene.id]?.isAi);
  const voiceLabel = isAiVoice
    ? t('learn.player.voice.ai')
    : audioCap?.hasSpeechSynthesis
      ? t('learn.player.voice.device')
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
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromPointer(e, false);
          }}
          onPointerMove={(e) => e.buttons && seekFromPointer(e, false)}
          onPointerUp={(e) => seekFromPointer(e, true)}
          onKeyDown={(e) => {
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
            {sceneOffsets.slice(1).map((so) => (
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
              onClick={() => {
                const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
                setSpeed(nextSpeed);
              }}
            >
              {speed}x
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={cn(iconBtn, showCaptions && 'bg-surface-strong')}
              aria-pressed={showCaptions}
              aria-label={t('learn.player.captions')}
              onClick={() => setShowCaptions((v) => !v)}
            >
              <Captions {...ICON} />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={iconBtn}
              aria-pressed={isMuted}
              aria-label={isMuted ? t('learn.player.unmute') : t('learn.player.mute')}
              onClick={() => setIsMuted((v) => !v)}
            >
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
