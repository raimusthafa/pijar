import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "cn"

/* ClickUp-style empty state: icon tile, one title, one sentence, one action. */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div data-slot="empty-state" className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {Icon && (
        <span className="mb-1 grid size-14 place-items-center rounded-inner border border-hairline bg-raised text-foreground">
          <Icon className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
      )}
      <h3 className="font-display text-h4 font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export { EmptyState }
