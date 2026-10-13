import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
  Variants follow simple-ui-rule: primary (ink pill, near-white text), secondary (transparent + hairline),
  danger (red + white), warning (amber + dark text). No tonal variants.
  ghost is a text button for low-emphasis actions (Cancel). default, outline and destructive are legacy aliases.
  Focus ring comes from the global :focus-visible rule. Press feedback is the pj-press utility.
*/
const primary = "bg-action text-action-foreground hover:bg-action-hover"
const secondary = "border-hairline-strong bg-transparent text-foreground hover:bg-hover"
const danger = "bg-danger text-danger-foreground hover:brightness-95"

const buttonVariants = cva(
  "pj-press group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-pill border border-transparent font-medium whitespace-nowrap select-none transition-[background-color,filter,border-color] duration-150 disabled:pointer-events-none disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground aria-disabled:pointer-events-none aria-disabled:bg-disabled aria-disabled:text-disabled-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary,
        secondary,
        danger,
        warning: "bg-warning text-warning-foreground hover:brightness-95",
        ghost: "bg-transparent text-foreground hover:bg-hover",
        link: "rounded-control text-foreground underline underline-offset-4 decoration-hairline-strong hover:decoration-foreground",
        default: primary,
        outline: secondary,
        destructive: danger,
      },
      // 44px minimum touch target below md, tighter from md up.
      size: {
        default: "h-11 px-5 text-sm md:h-10",
        xs: "h-11 px-3 text-xs md:h-7",
        sm: "h-11 px-4 text-sm md:h-9",
        lg: "h-12 px-6 text-base",
        icon: "size-11 md:size-10",
        "icon-xs": "size-11 md:size-7",
        "icon-sm": "size-11 md:size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
