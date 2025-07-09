"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Brain,
  FileText,
} from "lucide-react";

interface ModelSortBadgesProps {
  modelMetricRanges: {
    minCost: number;
    maxCost: number;
    minContext: number;
    maxContext: number;
    minMaxOutput: number;
    maxMaxOutput: number;
  };
  modelSortConfig: {
    field: "cost" | "context" | "maxOutput" | null;
    direction: "asc" | "desc" | "none";
  };
  onModelSort: (field: "cost" | "context" | "maxOutput") => void;
}

function formatTokenCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  } else if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K`;
  } else {
    return `${count}`;
  }
}

export function ModelSortBadges({
  modelMetricRanges,
  modelSortConfig,
  onModelSort,
}: ModelSortBadgesProps) {
  return (
    <>
      {/* Combined Cost badge */}
      <button
        onClick={() => {
          onModelSort("cost");
        }}
        className={`${
          modelSortConfig.field === "cost"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <ArrowLeftRight className="w-3.5 h-3.5 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          ${modelMetricRanges.minCost.toFixed(2)}-$
          {modelMetricRanges.maxCost.toFixed(2)}
        </span>
        {modelSortConfig.field === "cost" &&
          (modelSortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>

      {/* Context badge */}
      <button
        onClick={() => {
          onModelSort("context");
        }}
        className={`${
          modelSortConfig.field === "context"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <Brain className="w-3.5 h-3.5 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          {formatTokenCount(modelMetricRanges.minContext)}-
          {formatTokenCount(modelMetricRanges.maxContext)}
        </span>
        {modelSortConfig.field === "context" &&
          (modelSortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>

      {/* Max Output badge */}
      <button
        onClick={() => {
          onModelSort("maxOutput");
        }}
        className={`${
          modelSortConfig.field === "maxOutput"
            ? "bg-white/60 scale-105"
            : "bg-white/40 hover:bg-white/60"
        } backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all cursor-pointer`}
      >
        <FileText className="w-3.5 h-3.5 text-[#000000]/60" />
        <span className="text-sm font-medium text-[#333333]">
          {formatTokenCount(modelMetricRanges.minMaxOutput)}-
          {formatTokenCount(modelMetricRanges.maxMaxOutput)}
        </span>
        {modelSortConfig.field === "maxOutput" &&
          (modelSortConfig.direction === "asc" ? (
            <ArrowUp className="w-3 h-3 text-[#000000]/60" />
          ) : (
            <ArrowDown className="w-3 h-3 text-[#000000]/60" />
          ))}
      </button>
    </>
  );
}
