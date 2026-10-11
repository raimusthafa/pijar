'use client';

import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  CheckCircle2,
  AlertTriangle,
  Play,
  Lock,
  Sparkles,
  Clock,
  ChevronRight,
} from 'lucide-react';
import type { EnrichedConceptNode } from '@/lib/graph/types';

export interface ConceptNodeData {
  node: EnrichedConceptNode;
  isSelected?: boolean;
  isDimmed?: boolean;
  isPathHighlighted?: boolean;
  isRecommendedTarget?: boolean;
  onSelect?: (nodeId: string) => void;
}

function ConceptNodeComponentBase({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ConceptNodeData;
  const node = nodeData.node;
  const isSelected = selected || nodeData.isSelected;
  const isDimmed = nodeData.isDimmed;
  const isPathHighlighted = nodeData.isPathHighlighted;
  const isRecommended = nodeData.isRecommendedTarget;

  // Status visual configurations
  const getStatusConfig = () => {
    switch (node.status) {
      case 'completed':
        return {
          label: 'Dikuasai',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
          badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          borderClass: isSelected
            ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
            : 'border-emerald-500/40 hover:border-emerald-500/70',
          bgClass: 'bg-card/95',
          accentBar: 'bg-emerald-500',
        };
      case 'prerequisite_gap':
        return {
          label: 'Gap Prasyarat',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
          badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold',
          borderClass: isSelected
            ? 'border-amber-500 ring-2 ring-amber-500/60 shadow-xl shadow-amber-500/20'
            : 'border-amber-500/60 hover:border-amber-500',
          bgClass: 'bg-card/95 animate-gap-pulse',
          accentBar: 'pijar-gradient',
        };
      case 'in_progress':
        return {
          label: 'Sedang Belajar',
          icon: <Play className="w-3.5 h-3.5 text-sky-500 fill-sky-500/20" />,
          badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          borderClass: isSelected
            ? 'border-sky-500 ring-2 ring-sky-500/50 shadow-lg shadow-sky-500/10'
            : 'border-sky-500/40 hover:border-sky-500/70',
          bgClass: 'bg-card/95',
          accentBar: 'bg-sky-500',
        };
      case 'ready':
        return {
          label: 'Siap Belajar',
          icon: <Sparkles className="w-3.5 h-3.5 text-amber-500" />,
          badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          borderClass: isSelected
            ? 'border-amber-500 ring-2 ring-amber-500/50 shadow-lg shadow-amber-500/10'
            : 'border-amber-500/40 hover:border-amber-500/70',
          bgClass: 'bg-card/95',
          accentBar: 'bg-amber-500',
        };
      case 'locked':
      default:
        return {
          label: 'Terkunci',
          icon: <Lock className="w-3.5 h-3.5 text-muted-foreground" />,
          badgeClass: 'bg-muted text-muted-foreground border-border/40',
          borderClass: isSelected
            ? 'border-muted-foreground/60 ring-2 ring-muted/50'
            : 'border-border/60 hover:border-border',
          bgClass: 'bg-card/75 opacity-75',
          accentBar: 'bg-border',
        };
    }
  };

  const statusCfg = getStatusConfig();

  return (
    <div
      onClick={() => nodeData.onSelect?.(node.id)}
      className={`relative w-[250px] rounded-xl border-2 transition-all duration-200 cursor-pointer text-left select-none shadow-sm ${
        statusCfg.borderClass
      } ${statusCfg.bgClass} ${
        isDimmed ? 'opacity-25 grayscale-[30%] scale-95' : 'opacity-100'
      } ${
        isPathHighlighted && !isSelected ? 'ring-2 ring-pijar-400 shadow-md' : ''
      }`}
      style={{
        boxShadow: isSelected
          ? '0 8px 24px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(217, 119, 6, 0.15)'
          : undefined,
      }}
    >
      {/* Target Handle (Left) - Inbound Prerequisite Edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-background !-left-1.5 transition-transform hover:!scale-125"
      />

      {/* Recommended Target Pill Header */}
      {isRecommended && (
        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          Rekomendasi Utama
        </div>
      )}

      {/* Top Accent Strip */}
      <div className={`h-1.5 rounded-t-[10px] w-full ${statusCfg.accentBar}`} />

      {/* Node Body */}
      <div className="p-3.5">
        {/* Category & Status Badge Row */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground truncate max-w-[100px]">
            {node.category}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.badgeClass}`}
          >
            {statusCfg.icon}
            <span>{statusCfg.label}</span>
          </span>
        </div>

        {/* Concept Title */}
        <h4 className="font-bold text-sm text-foreground leading-snug line-clamp-1 mb-1.5" title={node.label}>
          {node.label}
        </h4>

        {/* Short Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3 min-h-[32px]">
          {node.description}
        </p>

        {/* Footer info: Estimated Minutes & Detail Arrow */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-muted-foreground/80" />
            ~{node.estimated_minutes} menit
          </span>
          <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform">
            Detail <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Source Handle (Right) - Outbound Dependent Edges */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-background !-right-1.5 transition-transform hover:!scale-125"
      />
    </div>
  );
}

export const ConceptNodeComponent = memo(ConceptNodeComponentBase);
