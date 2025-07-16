"use client";

import { ArrowDown, ArrowUp, Clock, DollarSign, WholeWord } from "lucide-react";

interface OverallStatsBadgesProps {
  overallStats: {
    completed: number;
    total: number;
    hasData: boolean;
    wordRange?: string;
    timeRange?: string;
    costRange?: string;
  };
  sortConfig: {
    field: "words" | "time" | "cost" | null;
    direction: "asc" | "desc" | "none";
  };
  onSort: (field: "words" | "time" | "cost") => void;
}

export function OverallStatsBadges({
  overallStats,
  sortConfig,
  onSort,
}: OverallStatsBadgesProps) {
  return (
    <>
      {/* Word range badge */}
      <button
        onClick={() => {
          onSort("words");
        }}
        className={`${
          sortConfig.field === "words"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <WholeWord className="w-4 h-4 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          {overallStats.wordRange} words
        </span>
        {sortConfig.field === "words" &&
          (sortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>

      {/* Time range badge */}
      <button
        onClick={() => {
          onSort("time");
        }}
        className={`${
          sortConfig.field === "time"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <Clock className="w-3.5 h-3.5 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          {overallStats.timeRange}
        </span>
        {sortConfig.field === "time" &&
          (sortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>

      {/* Cost range badge */}
      <button
        onClick={() => {
          onSort("cost");
        }}
        className={`${
          sortConfig.field === "cost"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <DollarSign className="w-3.5 h-3.5 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          {overallStats.costRange}
        </span>
        {sortConfig.field === "cost" &&
          (sortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>
    </>
  );
}
