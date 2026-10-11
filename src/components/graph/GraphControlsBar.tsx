'use client';

import React from 'react';
import {
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Filter,
  Layers,
} from 'lucide-react';

interface GraphControlsBarProps {
  onFitView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onFocusRecommendation: () => void;
  activeFilter: 'all' | 'gaps' | 'ready';
  onFilterChange: (filter: 'all' | 'gaps' | 'ready') => void;
  hasRecommendation: boolean;
}

export function GraphControlsBar({
  onFitView,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFocusRecommendation,
  activeFilter,
  onFilterChange,
  hasRecommendation,
}: GraphControlsBarProps) {
  return (
    <div className="absolute top-5 left-5 z-10 flex flex-wrap items-center gap-2 select-none">
      {/* ── Viewport Controls Pill ──────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-md">
        <button
          onClick={onZoomIn}
          title="Perbesar (Zoom In)"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        <button
          onClick={onZoomOut}
          title="Perkecil (Zoom Out)"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={onFitView}
          title="Sesuaikan Tampilan (Fit to View)"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors flex items-center gap-1.5 text-xs font-medium"
        >
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Fit View</span>
        </button>

        <button
          onClick={onResetView}
          title="Reset Sudut Pandang"
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          aria-label="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Focus Recommendation Button ─────────────────────── */}
      {hasRecommendation && (
        <button
          onClick={onFocusRecommendation}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold text-white pijar-gradient shadow-md shadow-amber-500/20 hover:shadow-amber-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Fokus Target Belajar</span>
        </button>
      )}

      {/* ── Quick Filter Tabs ───────────────────────────────── */}
      <div className="hidden lg:flex items-center gap-1 p-1 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-md text-xs">
        <button
          onClick={() => onFilterChange('all')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
            activeFilter === 'all'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Semua
        </button>

        <button
          onClick={() => onFilterChange('gaps')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1 ${
            activeFilter === 'gaps'
              ? 'bg-amber-500 text-white font-bold shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Hanya Gap
        </button>

        <button
          onClick={() => onFilterChange('ready')}
          className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
            activeFilter === 'ready'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Siap Belajar
        </button>
      </div>
    </div>
  );
}
