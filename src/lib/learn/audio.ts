// ================================================================
// PIJAR - Interactive Video Audio & Narration Controller (P5)
// Multi-tier audio abstraction: Web Speech, Cached Audio, Captions-Only
// ================================================================

import { speakable } from './math-text';

export type AudioMode = 'speech-synthesis' | 'cached-audio' | 'captions-only';

export interface AudioCapability {
  mode: AudioMode;
  hasSpeechSynthesis: boolean;
  hasIndonesianVoice: boolean;
  voiceName?: string;
  notes: string;
}

/**
 * Probes client browser audio capabilities.
 */
export function probeAudioCapability(lang: 'id' | 'en' = 'id'): AudioCapability {
  if (typeof window === 'undefined') {
    return {
      mode: 'captions-only',
      hasSpeechSynthesis: false,
      hasIndonesianVoice: false,
      notes: 'Server-side rendering: audio dinonaktifkan.',
    };
  }

  const hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  if (!hasSpeech) {
    return {
      mode: 'captions-only',
      hasSpeechSynthesis: false,
      hasIndonesianVoice: false,
      notes: 'Browser tidak mendukung Web Speech API; mode teks subtitle aktif.',
    };
  }

  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => v.lang.toLowerCase().startsWith(lang));

  if (idVoice) {
    return {
      mode: 'speech-synthesis',
      hasSpeechSynthesis: true,
      hasIndonesianVoice: true,
      voiceName: idVoice.name,
      notes: `Voice Bahasa Indonesia (${idVoice.name}) terdeteksi aktif.`,
    };
  }

  return {
    mode: 'speech-synthesis',
    hasSpeechSynthesis: true,
    hasIndonesianVoice: false,
    notes: 'Voice lokal Bahasa Indonesia belum terinstal di OS; menggunakan fallback suara standar.',
  };
}

export class VideoNarrationController {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isMuted: boolean = false;
  private playbackRate: number = 1.0;
  private capability: AudioCapability;
  private lang: 'id' | 'en';

  /** `lang` follows the interface locale; `hasIndonesianVoice` means "a voice for that language". */
  constructor(lang: 'id' | 'en' = 'id') {
    this.lang = lang;
    this.capability = probeAudioCapability(lang);
  }

  public getCapability(): AudioCapability {
    return this.capability;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public setRate(rate: number): void {
    this.playbackRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Speaks narration text safely with boundary guarantees.
   */
  public speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: unknown) => void
  ): void {
    if (this.isMuted || typeof window === 'undefined') return;

    this.stop(); // Always cancel previous audio to prevent overlaps

    if (!('speechSynthesis' in window)) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(speakable(text, this.lang));
      utterance.lang = this.lang === 'en' ? 'en-US' : 'id-ID';
      utterance.rate = this.playbackRate;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find(v => v.lang.toLowerCase().startsWith(this.lang));
      if (idVoice) {
        utterance.voice = idVoice;
      }

      utterance.onstart = () => {
        onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (e) => {
        this.currentUtterance = null;
        onError?.(e);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis playback warning:', err);
      onError?.(err);
    }
  }

  /**
   * Halts current audio playback immediately.
   */
  public stop(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * Pauses current speech.
   */
  public pause(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resumes current speech.
   */
  public resume(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }
}
