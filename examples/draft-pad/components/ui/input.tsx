import { cn } from "@/lib/utils"
import * as React from "react"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md text-sm shadow-xs transition-[color,box-shadow] outline-none focus:outline-none focus-visible:outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive border-[1.5px] border-white/10 shadow-[0_1.5px_1px_rgba(64,64,64,0.5)] bg-black/70 backdrop-blur-sm text-white px-3 py-1",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
