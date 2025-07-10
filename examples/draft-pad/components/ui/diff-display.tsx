"use client";

import { type DiffSegment } from "@/lib/diff-utils";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

/**
 * Animation Timeline (same for both auto and manual diffs):
 * 0ms: Diff appears with formatting enabled
 * 0-200ms: Added text fades in (opacity 0→1), colored text
 * 0-200ms: Removed text fades in (opacity 0→1) with red strikethrough
 * 1500ms: showFormatting set to false, triggers beautiful fade-out transitions
 * 1700-2300ms: Added text transitions to normal color (200ms delay + 800ms duration)
 * 1500-1900ms: Removed text fades out (400ms duration)
 *
 * The difference is in parent component behavior:
 * - AUTO-SHOWN DIFFS: Parent hides diff at 3000ms (useDiffState timer)
 * - MANUAL DIFFS: Parent keeps diff visible indefinitely
 *
 * When diff visibility changes, formatting resets to true for fresh animations.
 */

interface DiffDisplayProps {
  segments: DiffSegment[];
  isStreaming?: boolean;
  className?: string;
  showDiff?: boolean;
  autoShowDiff?: boolean;
  isManuallyHiding?: boolean;
}

export function DiffDisplay({
  segments,
  isStreaming = false,
  className,
  showDiff = false,
  autoShowDiff = false,
  isManuallyHiding = false,
}: DiffDisplayProps) {
  const [showFormatting, setShowFormatting] = useState(true);

  // Reset formatting when diff visibility changes
  useEffect(() => {
    setShowFormatting(true);
  }, [showDiff, autoShowDiff]);

  useEffect(() => {
    if (!isStreaming) {
      // Run fade-out animation for auto-shown diffs OR when manually hiding
      if (autoShowDiff || isManuallyHiding) {
        const timer = setTimeout(() => {
          setShowFormatting(false);
        }, 500);

        return () => {
          clearTimeout(timer);
        };
      }
      // Manual diffs (showDiff=true without hiding) keep formatting visible
    }
  }, [isStreaming, autoShowDiff, isManuallyHiding]);

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
                    : "rgb(21, 128, 61)" // green-700
                  : "#333333",
                fontWeight: 400,
              }}
              transition={{
                opacity: { duration: 0.2, ease: "easeOut" },
                color: {
                  duration: 0.2,
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
          return (
            <AnimatePresence key={key} mode="wait">
              {showFormatting && !isStreaming && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: { duration: 0.2, ease: "easeOut" },
                  }}
                  exit={{
                    opacity: 0,
                    transition: { duration: 0.2, ease: "easeIn" },
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
