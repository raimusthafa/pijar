import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
  Card: radius steps with size (sm 16 for cards inside cards, default 22, lg 48 for marketing cards).
  tone "surface" is a tone shift on the ground (no border). tone "raised" is the lighter card with a hairline,
  for cards that sit on a surface card or on the ground. No shadows.
*/
const cardVariants = cva(
  "group/card flex flex-col overflow-hidden text-sm text-card-foreground has-data-[slot=card-footer]:pb-0 *:[img:first-child]:rounded-t-[inherit]",
  {
    variants: {
      size: {
        sm: "gap-3 rounded-inner py-4 [--card-spacing:--spacing(4)]",
        default: "gap-4 rounded-card py-6 [--card-spacing:--spacing(6)]",
        lg: "gap-6 rounded-card-lg py-9 [--card-spacing:--spacing(9)]",
      },
      tone: {
        surface: "bg-card",
        raised: "bg-raised border border-hairline",
      },
    },
    defaultVariants: { size: "default", tone: "surface" },
  }
)

function Card({
  className,
  size = "default",
  tone = "surface",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(cardVariants({ size, tone }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-display text-lg leading-snug font-semibold tracking-[-0.02em] group-data-[size=lg]/card:text-h3 group-data-[size=sm]/card:text-base",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-(--card-spacing)", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center border-t border-hairline p-(--card-spacing)",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
}
