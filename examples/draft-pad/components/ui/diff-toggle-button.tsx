"use client";

import { Eye, EyeOff } from "lucide-react";

interface DiffToggleButtonProps {
  showDiff: boolean;
  onToggle: () => void;
}

export function DiffToggleButton({
  showDiff,
  onToggle,
}: DiffToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`${
        showDiff ? "bg-white/60 scale-105" : "bg-white/40 hover:bg-white/60"
      } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
    >
      {/* Icon reflects overall visibility for visual feedback */}
      {showDiff ? (
        <Eye className="w-4 h-4 text-[#000000]/60" />
      ) : (
        <EyeOff className="w-4 h-4 text-[#000000]/60" />
      )}
      {/* Text only reflects manual showDiff state to avoid confusion */}
      <span className="text-sm font-medium text-[#333333]">
        {showDiff ? "Hide Diff" : "Show Diff"}
      </span>
    </button>
  );
}
