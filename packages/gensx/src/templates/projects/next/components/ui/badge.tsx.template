import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default:
      "bg-primary text-primary-foreground border-transparent hover:bg-primary/80",
    secondary:
      "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80",
    destructive:
      "bg-destructive text-destructive-foreground border-transparent hover:bg-destructive/80",
    outline:
      "border-border text-foreground bg-transparent hover:bg-accent hover:text-accent-foreground",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
