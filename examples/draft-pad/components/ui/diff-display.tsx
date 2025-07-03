"use client";

import { type DiffSegment } from "@/lib/diff-utils";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("text-sm leading-relaxed", className)}>
      {segments.map((segment, index) => {
        if (segment.type === "unchanged") {
          return <span key={index}>{segment.value}</span>;
        } else if (segment.type === "added") {
          return (
            <span
              key={index}
              className={cn(
                "inline-block",
                isStreaming
                  ? "bg-blue-100 text-blue-900 transition-colors duration-300"
                  : "bg-green-100 text-green-900",
              )}
              style={{
                textDecoration: "none",
                borderRadius: "2px",
                padding: "0 2px",
              }}
            >
              {segment.value}
            </span>
          );
        } else {
          // removed
          return (
            <span
              key={index}
              className="text-red-600 line-through opacity-70"
              style={{
                textDecorationColor: "rgba(220, 38, 38, 0.8)",
                textDecorationThickness: "2px",
              }}
            >
              {segment.value}
            </span>
          );
        }
      })}
    </div>
  );
}
