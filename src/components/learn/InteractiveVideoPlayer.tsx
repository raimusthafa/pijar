'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Captions, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import type { VideoScriptPlan } from '@/lib/learn/types';
import { VideoNarrationController, probeAudioCapability } from '@/lib/learn/audio';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n/client';
import { cn } from '@/lib/utils';
import { SceneVisualRenderer } from './visuals/SceneVisualRenderer';

interface InteractiveVideoPlayerProps {
  script: VideoScriptPlan;
  onFinished?: () => void;
}

const SPEEDS = [1, 1.25, 1.5];
const ICON = { strokeWidth: 1.75, 'aria-hidden': true } as const;

const formatTime = (secs: number) => {
  const s = Math.floor(secs);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export function InteractiveVideoPlayer({ script, onFinished }: InteractiveVideoPlayerProps) {
  const { t, locale } = useT();
  const scenes = useMemo(() => script.scenes ?? [], [script.scenes]);
  const totalDuration = script.totalDurationSeconds || scenes.reduce((a, s) => a + s.durationSeconds, 0) || 45;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audio, setAudio] = useState(() => ({ locale, cap: probeAudioCapability(locale) }));
  if (audio.locale !== locale) setAudio({ locale, cap: probeAudioCapability(locale) });
  const audioCap = audio.cap;
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
    if (speech) speech.onvoiceschanged = () => setAudio({ locale, cap: probeAudioCapability(locale) });
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
        const start = scenes.slice(0, i).reduce((a, x) => a + x.durationSeconds, 0);
        return { id: s.id, start, end: start + s.durationSeconds, scene: s };
      }),
    [scenes],
  );

  const current = sceneOffsets.find(so => currentTime >= so.start && currentTime < so.end) ?? sceneOffsets[sceneOffsets.length - 1] ?? null;
  const activeScene = current?.scene ?? scenes[0];
  const activeIndex = Math.max(0, scenes.findIndex(s => s.id === activeScene?.id));

  // Before the first play, show the finished frame as a poster.
  const sceneProgress = current && (isPlaying || currentTime > 0)
    ? Math.min(1, Math.max(0, (currentTime - current.start) / Math.max(0.1, current.end - current.start)))
    : 1;

  const caption = showCaptions && activeScene
    ? activeScene.captions?.find(c => {
        const e = currentTime - (current?.start ?? 0);
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

  const voiceLabel = audioCap?.hasIndonesianVoice
    ? t('learn.player.voice.native')
    : audioCap?.hasSpeechSynthesis
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
        <p className="min-w-0 flex-1 basis-48 text-sm font-medium">{script.title}</p>
        <Badge variant="outline">{voiceLabel}</Badge>
      </div>

      <div className="pj-panel-soft flex min-h-[340px] flex-1 flex-col items-center justify-center gap-4 p-4 md:p-8">
        {activeScene && (
          <div className="w-full max-w-2xl">
            <SceneVisualRenderer
              type={activeScene.visualType}
              state={activeScene.visualState}
              title={activeScene.title}
              progress={sceneProgress}
              interactive={!isPlaying}
            />
          </div>
        )}
        <div className="flex min-h-11 w-full max-w-xl items-center justify-center" aria-live="off">
          {caption && (
            <p className="rounded-inner bg-action px-4 py-2 text-center text-sm text-action-foreground">{caption}</p>
          )}
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
