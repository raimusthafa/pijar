import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ConceptStatus = 'completed' | 'gap' | 'ready' | 'locked';

const BADGE = {
  completed: 'success',
  gap: 'warning',
  ready: 'accent',
  locked: 'neutral',
} as const;

/**
 * Same anatomy as the app's concept node (graph/ConceptNodeComponent): category label, status badge, title.
 * Built from foundation tokens, so it can sit on the landing page without React Flow.
 */
export function ConceptCard({
  category,
  title,
  status,
  statusLabel,
  className,
}: {
  category: string;
  title: string;
  status: ConceptStatus;
  statusLabel: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-inner border border-hairline bg-raised p-3 text-left', className)}>
      <span className="text-xs font-medium text-muted-foreground">{category}</span>
      <span className="font-display text-base leading-tight font-semibold tracking-[-0.02em] text-foreground">{title}</span>
      <Badge variant={BADGE[status]} className="mt-auto">{statusLabel}</Badge>
    </div>
  );
}
