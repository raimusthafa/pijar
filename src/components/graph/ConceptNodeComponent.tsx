'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { ChevronRight, Clock, Target } from 'lucide-react';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import type { NodeStatus } from '@/types';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { MathText } from '@/components/ui/math-text';
import { cn } from '@/lib/utils';
import { StatusChip } from './StatusChip';

export type ConceptNodeData = {
  node: EnrichedConceptNode;
  selected: boolean;
  /** On the prerequisite path of the selected concept (up to two levels back). */
  onPath: boolean;
  dimmed: boolean;
  tabbable: boolean;
  isRecommended?: boolean;
  onSelect: (id: string, viaKeyboard: boolean) => void;
  onArrow: (id: string, key: string) => void;
};

export type ConceptFlowNode = Node<ConceptNodeData, 'conceptNode'>;

const STATUS_BORDER: Record<NodeStatus, string> = {
  completed: 'border-success',
  prerequisite_gap: 'border-danger',
  in_progress: 'border-warning',
  ready: 'border-amber',
  locked: 'border-hairline-strong',
};

function ConceptNode({ data }: NodeProps<ConceptFlowNode>) {
  const { t } = useT();
  const { node, selected, onPath, dimmed, tabbable, isRecommended, onSelect, onArrow } = data;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={false}
        className="!size-2.5 !rounded-full !bg-amber !border-2 !border-ground !-left-[5px] transition-transform hover:!scale-125"
      />

      {isRecommended && (
        <div className="absolute -top-3 left-3 z-20 inline-flex items-center gap-1 rounded-pill bg-amber px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-foreground">
          <Target className="size-3" strokeWidth={2} aria-hidden />
          <span>{t('graph.node.recommended')}</span>
        </div>
      )}

      <button
        type="button"
        id={`gnode-${node.id}`}
        tabIndex={tabbable ? 0 : -1}
        aria-pressed={selected}
        aria-label={t('graph.node.aria', { label: node.label, status: t(`graph.status.${node.status}` as MessageKey) })}
        onClick={(e) => onSelect(node.id, e.detail === 0)}
        onKeyDown={(e) => {
          if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            onArrow(node.id, e.key);
          }
        }}
        className={cn(
          'pj-press relative flex w-[264px] flex-col items-start gap-2 rounded-inner border-2 bg-raised p-3.5 text-left transition-[opacity,border-color] duration-200 ease-out-pj',
          STATUS_BORDER[node.status] ?? 'border-hairline',
          selected ? 'ring-2 ring-ink ring-offset-2 ring-offset-background' : onPath ? 'ring-2 ring-amber' : '',
          dimmed ? 'opacity-25' : node.status === 'locked' ? 'opacity-75' : 'opacity-100',
          'hover:brightness-[0.98]',
        )}
      >
        {/* Top row: Category (left) + StatusChip (right) */}
        <div className="flex w-full items-center justify-between gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate max-w-[120px]">
            {node.category || '\u00A0'}
          </span>
          <StatusChip status={node.status} className="h-5 px-2 text-[11px]" />
        </div>

        {/* Title: 15px font-semibold, leading-snug, line-clamp-2, MathText */}
        <div className="w-full text-[15px] font-semibold leading-snug text-foreground line-clamp-2">
          <MathText text={node.label} />
        </div>

        {/* Description: 12px text-muted-foreground, line-clamp-2, min-h 32px */}
        <p className="w-full text-xs text-muted-foreground line-clamp-2 min-h-8 leading-relaxed">
          {node.description || '\u00A0'}
        </p>

        {/* Footer: Clock + minutes on left, Detail + Chevron on right */}
        <div className="flex w-full items-center justify-between border-t border-hairline pt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
            <Clock className="size-3.5" strokeWidth={1.75} aria-hidden />
            <span>~{t('graph.node.minutes', { n: node.estimated_minutes })}</span>
          </span>
          <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
            <span>{t('graph.node.detail')}</span>
            <ChevronRight className="size-3.5 text-amber" strokeWidth={2} aria-hidden />
          </span>
        </div>
      </button>

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={false}
        className="!size-2.5 !rounded-full !bg-amber !border-2 !border-ground !-right-[5px] transition-transform hover:!scale-125"
      />
    </div>
  );
}

export const ConceptNodeComponent = memo(ConceptNode);
