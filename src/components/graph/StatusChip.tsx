'use client';

import { Check, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useT } from '@/lib/i18n/client';
import type { MessageKey } from '@/lib/i18n/messages';
import type { NodeStatus } from '@/types';

export const STATUS_VARIANT = {
  prerequisite_gap: 'danger',
  in_progress: 'warning',
  completed: 'success',
  ready: 'neutral',
  locked: 'neutral',
} as const;

/** Solid status chip. Locked and completed carry a small glyph so neutral does not read as one state. */
export function StatusChip({ status, className }: { status: NodeStatus; className?: string }) {
  const { t } = useT();
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'neutral'} className={className}>
      {status === 'locked' && <Lock strokeWidth={2} aria-hidden />}
      {status === 'completed' && <Check strokeWidth={2.25} aria-hidden />}
      {t(`graph.status.${status}` as MessageKey)}
    </Badge>
  );
}
