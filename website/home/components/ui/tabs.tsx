"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex w-full",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex-1 relative p-2 text-sm font-medium text-center transition-colors",
      "border border-[rgb(229, 229, 229)]",
      "focus-visible:outline-none",
      className
    )}
    {...props}
  >
    <div className="relative z-10">
      {props.children}
    </div>

    {/* Active highlight */}
    {(props as { 'data-state'?: string })['data-state'] === 'active' && (
      <motion.div
        layoutId="tab-highlight"
        className="absolute inset-0 bg-[#ffe066]/20 border border-[#ffe066]"
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 30
        }}
      />
    )}
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2",
      className
    )}
    {...props}
  >
    {props.children}
  </TabsPrimitive.Content>
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
