import * as React from "react"
import { cn } from "cn"

/* Field border uses --pj-field-border (3:1 on ground). Label above, error below, never placeholder-as-label. */
const field =
  "w-full rounded-control border border-field bg-raised px-3.5 text-base text-foreground transition-colors duration-150 placeholder:text-text-faint disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-danger md:text-sm"

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(field, "h-11 md:h-10", className)} {...props} />
}

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea data-slot="textarea" className={cn(field, "min-h-24 py-2.5 leading-normal", className)} {...props} />
}

export { Input, Textarea }
