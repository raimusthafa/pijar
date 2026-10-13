'use client';

import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { EnrichedConceptNode } from '@/lib/graph/types';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/lib/utils';
import { StatusChip } from './StatusChip';

export type ConceptNodeData = {
  node: EnrichedConceptNode;
  selected: boolean;
  /** On the prerequisite path of the selected concept (up to two levels back). */
  onPath: boolean;
  dimmed: boolean;
  tabbable: boolean;
  onSelect: (id: string, viaKeyboard: boolean) => void;
  onArrow: (id: string, key: string) => void;
};

export type ConceptFlowNode = Node<ConceptNodeData, 'conceptNode'>;

const hidden = { opacity: 0, pointerEvents: 'none', minWidth: 1, minHeight: 1, width: 1, height: 1 } as const;

function ConceptNode({ data }: NodeProps<ConceptFlowNode>) {
  const { t } = useT();
  const { node, selected, onPath, dimmed, tabbable, onSelect, onArrow } = data;
  return (
    <>
      <Handle type="target" position={Position.Left} isConnectable={false} style={hidden} />
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
          'pj-press flex w-[232px] flex-col items-start gap-2.5 rounded-inner border bg-raised p-3 text-left transition-[opacity,background-color,border-color] duration-200 ease-out-pj',
          selected ? 'border-foreground' : onPath ? 'border-hairline-strong bg-surface' : 'border-hairline',
          dimmed && 'opacity-40',
          'hover:bg-surface',
        )}
      >
        <span className="line-clamp-2 text-sm leading-snug font-medium text-foreground">{node.label}</span>
        <span className="flex items-center gap-2">
          <StatusChip status={node.status} />
          {node.estimated_minutes > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">{t('graph.node.minutes', { n: node.estimated_minutes })}</span>
          )}
        </span>
      </button>
      <Handle type="source" position={Position.Right} isConnectable={false} style={hidden} />
    </>
  );
}

export const ConceptNodeComponent = memo(ConceptNode);
