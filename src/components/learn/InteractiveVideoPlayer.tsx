'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { VideoScriptPlan, VideoScene } from '@/lib/learn/types';
import { VideoNarrationController, probeAudioCapability, type AudioCapability } from '@/lib/learn/audio';
import { SceneVisualRenderer } from './visuals/SceneVisualRenderer';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Subtitles,
  FastForward,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface InteractiveVideoPlayerProps {
  script: VideoScriptPlan;
  onFinished?: () => void;
}

export function InteractiveVideoPlayer({ script, onFinished }: InteractiveVideoPlayerProps) {
  const scenes = script.scenes || [];
  const totalDuration = script.totalDurationSeconds || 45;

  // Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [audioCap, setAudioCap] = useState<AudioCapability | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const narrationControllerRef = useRef<VideoNarrationController | null>(null);
  const lastSpokenSceneRef = useRef<number | null>(null);

  // Initialize Audio Controller once on mount
  useEffect(() => {
    const controller = new VideoNarrationController();
    narrationControllerRef.current = controller;
    setAudioCap(controller.getCapability());

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const handleVoicesChanged = () => {
        setAudioCap(probeAudioCapability());
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      return () => {
        controller.stop();
        window.speechSynthesis.onvoiceschanged = null;
      };
    }

    return () => {
      controller.stop();
    };
  }, []);

  // Sync mute state
  useEffect(() => {
    narrationControllerRef.current?.setMuted(isMuted);
  }, [isMuted]);

  // Sync playback rate
  useEffect(() => {
    narrationControllerRef.current?.setRate(playbackSpeed);
  }, [playbackSpeed]);

  // Compute scene time offsets
  const sceneOffsets = React.useMemo(() => {
    let acc = 0;
    return scenes.map(s => {
      const start = acc;
      acc += s.durationSeconds;
      return { id: s.id, start, end: acc, scene: s };
    });
  }, [scenes]);

  // Determine active scene based on currentTime
  const currentSceneInfo = React.useMemo(() => {
    const found = sceneOffsets.find(so => currentTime >= so.start && currentTime < so.end);
    return found || sceneOffsets[sceneOffsets.length - 1] || null;
  }, [sceneOffsets, currentTime]);

  const activeScene = currentSceneInfo?.scene || scenes[0];
  const activeSceneIndex = scenes.findIndex(s => s.id === activeScene?.id);

  // Determine active caption
  const activeCaption = React.useMemo(() => {
    if (!activeScene || !showCaptions) return null;
    const sceneElapsed = currentTime - (currentSceneInfo?.start || 0);
    const cap = activeScene.captions?.find(
      c => sceneElapsed >= c.startSeconds && sceneElapsed <= c.endSeconds
    );
    return cap?.text || null;
  }, [activeScene, showCaptions, currentTime, currentSceneInfo]);

  // Narration triggers using VideoNarrationController
  const speakNarration = useCallback((text: string) => {
    narrationControllerRef.current?.speak(text);
  }, []);

  const stopSpeech = useCallback(() => {
    narrationControllerRef.current?.stop();
  }, []);

  // Main playback timer loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const tick = (now: number) => {
      if (isPlaying) {
        const delta = (now - lastTimestamp) / 1000;
        lastTimestamp = now;

        setCurrentTime(prev => {
          const next = prev + delta * playbackSpeed;
          if (next >= totalDuration) {
            setIsPlaying(false);
            stopSpeech();
            onFinished?.();
            return totalDuration;
          }
          return next;
        });
      } else {
        lastTimestamp = now;
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playbackSpeed, totalDuration, stopSpeech, onFinished]);

  // Trigger narration when scene index transitions
  useEffect(() => {
    if (isPlaying && activeSceneIndex !== lastSpokenSceneRef.current) {
      lastSpokenSceneRef.current = activeSceneIndex;
      if (activeScene?.narration) {
        speakNarration(activeScene.narration);
      }
    }
  }, [isPlaying, activeSceneIndex, activeScene, speakNarration]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    if (currentTime >= totalDuration) {
      setCurrentTime(0);
      lastSpokenSceneRef.current = null;
    }

    setIsPlaying(prev => {
      const next = !prev;
      if (!next) {
        stopSpeech();
      } else if (activeScene?.narration && lastSpokenSceneRef.current !== activeSceneIndex) {
        lastSpokenSceneRef.current = activeSceneIndex;
        speakNarration(activeScene.narration);
      }
      return next;
    });
  };

  // Seek handler
  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(newTime, totalDuration));
    setCurrentTime(clamped);
    stopSpeech();
    lastSpokenSceneRef.current = null; // Re-arm speech trigger on seek
    if (isPlaying && activeScene?.narration) {
      speakNarration(activeScene.narration);
    }
  };

  // Jump to specific scene
  const handleJumpScene = (index: number) => {
    const target = sceneOffsets[index];
    if (target) {
      handleSeek(target.start);
    }
  };

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={playerContainerRef}
      className={`relative w-full rounded-3xl overflow-hidden border border-border/80 bg-slate-950 text-white flex flex-col shadow-2xl transition-all ${
        isFullscreen ? 'h-screen' : 'min-h-[460px]'
      }`}
    >
      {/* ── Scene Navigation Header ─────────────────────────── */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-3 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 truncate">
            {script.title}
          </span>
          {audioCap?.hasIndonesianVoice ? (
            <span
              className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              title={audioCap.notes}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Voice ID
            </span>
          ) : audioCap?.hasSpeechSynthesis ? (
            <span
              className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20"
              title={audioCap.notes}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              OS Voice
            </span>
          ) : (
            <span
              className="hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20"
              title={audioCap?.notes}
            >
              Subtitle
            </span>
          )}
        </div>

        {/* Scene Steps Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%] py-1">
          {scenes.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => handleJumpScene(idx)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all shrink-0 flex items-center gap-1 ${
                idx === activeSceneIndex
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>{idx + 1}.</span>
              <span className="hidden sm:inline truncate max-w-[100px]">{s.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Stage / Visual Scene Canvas ────────────────── */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-slate-950 overflow-hidden">
        {activeScene && (
          <div className="w-full max-w-2xl h-full flex items-center justify-center">
            <SceneVisualRenderer
              type={activeScene.visualType}
              state={activeScene.visualState}
              title={activeScene.title}
            />
          </div>
        )}

        {/* Floating Closed Captions Overlay */}
        {activeCaption && showCaptions && (
          <div className="absolute bottom-6 px-6 max-w-xl text-center pointer-events-none transition-all duration-200">
            <div className="inline-block bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-100 shadow-xl">
              {activeCaption}
            </div>
          </div>
        )}
      </div>

      {/* ── Video Player Controls Bar ───────────────────────── */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800/80 space-y-3 z-10 backdrop-blur-md">
        {/* Timeline Bar with Scene Dividers */}
        <div className="relative group">
          <div
            className="h-2 w-full bg-slate-800 rounded-full cursor-pointer relative overflow-hidden group-hover:h-3 transition-all"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              handleSeek(ratio * totalDuration);
            }}
          >
            {/* Progress Fill */}
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-75 relative"
              style={{ width: `${(currentTime / totalDuration) * 100}%` }}
            />
          </div>

          {/* Scene Marker Pins */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex">
            {sceneOffsets.map((so, i) => (
              <div
                key={so.id}
                className="absolute top-0 w-0.5 h-full bg-slate-950/60"
                style={{ left: `${(so.start / totalDuration) * 100}%` }}
                title={`Scene ${i + 1}: ${so.scene.title}`}
              />
            ))}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between text-slate-300 text-xs">
          {/* Left Controls: Play/Pause, Replay, Prev, Next, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleTogglePlay}
              className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center justify-center transition-transform active:scale-95 shadow-md shadow-amber-500/20"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Ulangi dari Awal"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleJumpScene(Math.max(0, activeSceneIndex - 1))}
              disabled={activeSceneIndex <= 0}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
              title="Scene Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleJumpScene(Math.min(scenes.length - 1, activeSceneIndex + 1))}
              disabled={activeSceneIndex >= scenes.length - 1}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-30"
              title="Scene Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <span className="font-mono text-slate-400 text-[11px] ml-1">
              <strong className="text-white">{formatTime(currentTime)}</strong> / {formatTime(totalDuration)}
            </span>
          </div>

          {/* Right Controls: Speed, Subtitle CC, Voice Mute, Fullscreen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Speed Selector */}
            <button
              onClick={() => {
                const nextSpeed = playbackSpeed === 1.0 ? 1.25 : playbackSpeed === 1.25 ? 1.5 : 1.0;
                setPlaybackSpeed(nextSpeed);
              }}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300 font-mono text-[11px] font-bold transition-colors"
              title="Kecepatan Video"
            >
              {playbackSpeed}x
            </button>

            {/* Captions Toggle */}
            <button
              onClick={() => setShowCaptions(prev => !prev)}
              className={`p-2 rounded-lg transition-colors ${
                showCaptions ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Subtitle / Closed Captions"
            >
              <Subtitles className="w-4 h-4" />
            </button>

            {/* Audio Mute Toggle */}
            <button
              onClick={() => {
                setIsMuted(prev => !prev);
              }}
              className={`p-2 rounded-lg transition-colors ${
                isMuted ? 'text-slate-500' : 'text-slate-300 hover:text-white'
              }`}
              title={
                isMuted
                  ? 'Nyalakan Narasi Suara'
                  : audioCap?.hasIndonesianVoice
                  ? `Suara Bahasa Indonesia Aktif (${audioCap.voiceName})`
                  : audioCap?.hasSpeechSynthesis
                  ? 'Suara Standar Aktif (Voice ID-ID belum terinstal di OS)'
                  : 'Mode Teks Subtitle Aktif'
              }
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleToggleFullscreen}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Layar Penuh"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
