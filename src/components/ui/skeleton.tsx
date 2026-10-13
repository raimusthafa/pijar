import * as React from "react"
import { cn } from "cn"

/* Calm opacity pulse (pj-skeleton). Give it the size of the real content so the layout does not jump. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" aria-hidden className={cn("pj-skeleton rounded-control", className)} {...props} />
}

export { Skeleton }
