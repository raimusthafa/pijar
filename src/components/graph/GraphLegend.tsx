'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Lock, Sparkles, Play, ArrowRight } from 'lucide-react';

export function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute bottom-5 left-5 z-10 select-none">
      <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md shadow-lg overflow-hidden transition-all duration-200">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
          <span>Panduan Simbol Graf</span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 ml-1" /> : <ChevronUp className="w-3.5 h-3.5 ml-1" />}
        </button>

        {isOpen && (
          <div className="p-3.5 pt-1 space-y-2.5 text-[11px] border-t border-border/50 max-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-foreground">Dikuasai:</strong> Konsep telah dipahami (lulus kuis).
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <div className="flex-1">
                <strong className="text-amber-500">Gap Prasyarat:</strong> Akar kelemahan dasar dari tes diagnostik.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
              <div className="flex-1">
                <strong className="text-foreground">Siap Belajar:</strong> Prasyarat telah lengkap, siap dipelajari.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              <div className="flex-1">
                <strong className="text-foreground">Sedang Belajar:</strong> Materi yang sedang aktif dipelajari.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground shrink-0 opacity-50" />
              <div className="flex-1">
                <strong className="text-muted-foreground">Terkunci:</strong> Membutuhkan materi prasyarat sebelumnya.
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-muted-foreground text-[10px]">
              <span className="font-semibold text-foreground">Arah Panah:</span>
              <span>Prasyarat Dasar</span>
              <ArrowRight className="w-3 h-3 text-amber-500" />
              <span>Konsep Lanjutan</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
