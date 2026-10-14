import { Check, X } from "lucide-react"
import { cn } from "cn"
import { MathText } from '@/components/ui/math-text';

/*
  One answer choice for review, diagnostic and post-test. The row keeps a quiet raised surface;
  the verdict lives in a solid border and a small solid chip (danger or success, white glyph), so a wrong
  answer never floods the card with red. Everything else dims.
*/
export type AnswerState = "idle" | "picked" | "correct" | "wrong" | "dim"

function AnswerOption({
  state = "idle",
  keyHint,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & { state?: AnswerState; keyHint?: number }) {
  return (
    <button
      type="button"
      data-state={state}
      className={cn(
        "pj-press flex min-h-12 w-full items-center gap-3 rounded-inner border px-4 py-2 text-left text-sm transition-colors duration-150",
        state === "idle" && "border-field bg-raised hover:bg-hover",
        state === "picked" && "border-foreground bg-surface",
        state === "correct" && "border-2 border-success bg-raised",
        state === "wrong" && "border-2 border-danger bg-raised",
        state === "dim" && "border-hairline bg-raised text-muted-foreground",
        className
      )}
      {...props}
    >
      {keyHint !== undefined && (
        <kbd
          aria-hidden
          className="hidden size-6 shrink-0 place-items-center rounded-control border border-hairline-strong font-sans text-xs text-muted-foreground tabular-nums md:grid"
        >
          {keyHint}
        </kbd>
      )}
      <span className="min-w-0 flex-1">{typeof children === "string" ? <MathText text={children} /> : children}</span>
      {state === "correct" && (
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-pill bg-success text-success-foreground">
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
      )}
      {state === "wrong" && (
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-pill bg-danger text-danger-foreground">
          <X className="size-3.5" strokeWidth={2.5} />
        </span>
      )}
    </button>
  )
}

export { AnswerOption }
