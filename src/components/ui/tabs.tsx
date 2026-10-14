"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "cn"

/*
  Letters-style pill tabs: a tone track with a lighter pill that slides to the active tab.
  The indicator moves with translate and width only.
*/
function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

function TabsList({ className, children, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "relative inline-flex w-fit items-center gap-1 rounded-pill bg-surface p-1",
        className
      )}
      {...props}
    >
      <TabsPrimitive.Indicator
        className="absolute top-(--active-tab-top) left-0 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-pill bg-brand transition-[translate,width] duration-200 ease-out-pj motion-reduce:transition-none"
      />
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "pj-press relative z-10 inline-flex h-11 items-center justify-center gap-2 rounded-pill px-4 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-150 select-none hover:bg-hover hover:text-foreground data-active:text-brand-foreground data-active:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink md:h-9 [&_svg]:size-4 [&_svg]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("outline-none", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
