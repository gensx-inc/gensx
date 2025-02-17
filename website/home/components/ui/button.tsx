import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[0px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-[#ffde59]/50 to-[#ffe066]/20 border-[1px] border-[#ffde59] hover:bg-gradient-to-r hover:from-[#ffde59]/70 hover:to-[#ffe066]/40",
        secondary:
          "border-[1px] border-[#ffde59]/80 hover:bg-[#ffe066]/20",
        ghost: "hover:bg-[#ffe066]/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[0px] px-3 text-xs",
        lg: "h-10 rounded-[0px] px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  variant?: "primary" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn("relative group", buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {props.children}
        {/* Decorative corner elements with subtle animations */}
        <span className="absolute inset-0 pointer-events-none">
          <span
            className="absolute top-[-4px] left-[-4px] h-2 w-2 border-t border-l border-current
            opacity-0 transform translate-x-[2px] translate-y-[2px] transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
            group-active:opacity-0 group-active:translate-x-[2px] group-active:translate-y-[2px]
            group-active:duration-150"
          />
          <span
            className="absolute top-[-4px] right-[-4px] h-2 w-2 border-t border-r border-current
            opacity-0 transform -translate-x-[2px] translate-y-[2px] transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
            group-active:opacity-0 group-active:-translate-x-[2px] group-active:translate-y-[2px]
            group-active:duration-150"
          />
          <span
            className="absolute bottom-[-4px] left-[-4px] h-2 w-2 border-b border-l border-current
            opacity-0 transform translate-x-[2px] -translate-y-[2px] transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
            group-active:opacity-0 group-active:translate-x-[2px] group-active:-translate-y-[2px]
            group-active:duration-150"
          />
          <span
            className="absolute bottom-[-4px] right-[-4px] h-2 w-2 border-b border-r border-current
            opacity-0 transform -translate-x-[2px] -translate-y-[2px] transition-all duration-300
            group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0
            group-active:opacity-0 group-active:-translate-x-[2px] group-active:-translate-y-[2px]
            group-active:duration-150"
          />
        </span>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
