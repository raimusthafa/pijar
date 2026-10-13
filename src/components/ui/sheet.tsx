"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

/*
  Edge sheet on the Dialog primitive, for the mobile menu. Enters and leaves along the same edge
  (spatial consistency), drawer curve, 360ms. Under reduced motion it cross-fades instead of sliding.
*/
const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-popover text-popover-foreground outline-none transition-[opacity,transform] duration-[360ms] ease-drawer data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:duration-200 motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-ending-style:translate-x-0 motion-reduce:data-ending-style:translate-y-0",
  {
    variants: {
      side: {
        left: "inset-y-2 left-2 w-[min(20rem,calc(100%-1rem))] rounded-card border border-hairline data-starting-style:-translate-x-6 data-ending-style:-translate-x-6",
        top: "inset-x-2 top-2 rounded-card border border-hairline data-starting-style:-translate-y-6 data-ending-style:-translate-y-6",
      },
    },
    defaultVariants: { side: "left" },
  }
)

const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetTitle = DialogPrimitive.Title

function SheetContent({
  side,
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props & VariantProps<typeof sheetVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-scrim transition-opacity duration-200 ease-out-pj data-starting-style:opacity-0 data-ending-style:opacity-0" />
      <DialogPrimitive.Popup data-slot="sheet-content" className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetTitle, SheetContent }
