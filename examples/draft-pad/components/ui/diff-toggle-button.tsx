"use client";

import { Eye, EyeOff } from "lucide-react";

interface DiffToggleButtonProps {
  showDiff: boolean;
  autoShowDiff: boolean;
  onToggle: () => void;
}

export function DiffToggleButton({
  showDiff,
  autoShowDiff,
  onToggle,
}: DiffToggleButtonProps) {
  // Determine if diff is currently visible from any source
  const isDiffVisible = showDiff || autoShowDiff;

  return (
    <button
      onClick={onToggle}
      className={`${
        isDiffVisible
          ? "bg-white/60 scale-105"
          : "bg-white/40 hover:bg-white/60"
      } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
    >
      {isDiffVisible ? (
        <Eye className="w-4 h-4 text-[#000000]/60" />
      ) : (
        <EyeOff className="w-4 h-4 text-[#000000]/60" />
      )}
      <span className="text-sm font-medium text-[#333333]">
        {isDiffVisible ? "Hide Diff" : "Show Diff"}
      </span>
    </button>
  );
}
