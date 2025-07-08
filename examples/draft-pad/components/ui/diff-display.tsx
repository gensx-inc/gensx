"use client";

import { type DiffSegment } from "@/lib/diff-utils";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Animation Timeline:
 * 0ms: Diff appears
 * 0-200ms: Added text fades in (opacity 0→1), colored text
 * 0-200ms: Removed text fades in (opacity 0→1) with red strikethrough
 * 1500ms: showFormatting set to false, triggers transitions
 * 1700-2300ms: Added text transitions to normal color (200ms delay + 800ms duration)
 * 1500-1900ms: Removed text fades out (400ms duration)
 * 2500ms: Parent component hides diff display
 */

interface DiffDisplayProps {
  segments: DiffSegment[];
  isStreaming?: boolean;
  className?: string;
}

export function DiffDisplay({
  segments,
  isStreaming = false,
  className,
}: DiffDisplayProps) {
  const [showFormatting, setShowFormatting] = useState(true);

  useEffect(() => {
    if (!isStreaming) {
      // Start fading out formatting after 1.5 seconds
      const timer = setTimeout(() => {
        setShowFormatting(false);
      }, 1500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [isStreaming]);

  return (
    <div className={cn("text-sm leading-relaxed text-[#333333]", className)}>
      {segments.map((segment, index) => {
        const key = `${index}-${segment.value.substring(0, 10)}`;

        if (segment.type === "unchanged") {
          return (
            <span key={key} className="text-[#333333]">
              {segment.value}
            </span>
          );
        } else if (segment.type === "added") {
          return (
            <motion.span
              key={key}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                color: showFormatting
                  ? isStreaming
                    ? "rgb(59, 130, 246)" // blue-500
                    : "rgb(34, 197, 94)" // green-500
                  : "#333333",
                fontWeight: 400,
              }}
              transition={{
                opacity: { duration: 0.2, ease: "easeOut" },
                color: {
                  duration: 0.8,
                  ease: "easeInOut",
                  delay: showFormatting ? 0 : 0.2,
                },
              }}
              className="inline"
            >
              {segment.value}
            </motion.span>
          );
        } else {
          // removed - show with strikethrough then fade out
          return (
            <AnimatePresence key={key} mode="wait">
              {showFormatting && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.2, ease: "easeOut" },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.4, ease: "easeIn" },
                  }}
                  className="inline text-red-500 line-through"
                  style={{
                    textDecorationColor: "rgba(239, 68, 68, 0.6)",
                    textDecorationThickness: "1px",
                  }}
                >
                  {segment.value}
                </motion.span>
              )}
            </AnimatePresence>
          );
        }
      })}
    </div>
  );
}
