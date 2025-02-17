import React, { CSSProperties, ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export interface ShimmerButtonProps extends ComponentPropsWithoutRef<"button"> {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  variant?: 'default' | 'ghost';
  className?: string;
  children?: React.ReactNode;
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#000000",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "0px",
      background = "rgb(255, 255, 255)",
      variant = 'default',
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const isGhost = variant === 'ghost';
    
    return (
      <button
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": isGhost ? "rgba(0, 0, 0, 0.1)" : shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": isGhost ? "transparent" : background,
          } as CSSProperties
        }
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border px-6 py-2 [border-radius:var(--radius)]",
          isGhost ? "border-black text-black hover:bg-black/5" : "border-[#ffde59]/90 dark:text-black bg-gradient-to-r from-[#ffde59]/50 to-[#ffe066]/20 transition-all",
          "transform-gpu transition-transform duration-300 ease-in-out active:translate-y-px",
          className,
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-30 blur-[2px]",
            "absolute inset-0 overflow-visible [container-type:size]",
            isGhost && "opacity-50"
          )}
        >
          {/* spark */}
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
            {/* spark before */}
            <div className="absolute -inset-full w-auto rotate-0 animate-spin-around [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>
        {children}

        {/* Highlight */}
        <div
          className={cn(
            "insert-0 absolute size-full",
            "rounded-2xl px-4 py-1.5 text-sm font-medium",
            isGhost ? "shadow-none" : "shadow-[inset_0_-8px_10px_#ffffff1f]",
            "transform-gpu transition-all duration-300 ease-in-out",
            !isGhost && [
              "group-hover:shadow-[inset_0_-6px_10px_#ffffff3f]",
              "group-active:shadow-[inset_0_-10px_10px_#ffffff3f]",
            ],
          )}
        />

        {/* backdrop */}
        <div
          className={cn(
            "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]",
          )}
        />
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";
