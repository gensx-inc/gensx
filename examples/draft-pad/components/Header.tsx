"use client";

import { ProviderFilter } from "@/components/ui/provider-filter";
import { type DraftProgress, type ModelConfig } from "@/gensx/workflows";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { ModelSortBadges } from "./ModelSortBadges";
import { OverallStatsBadges } from "./OverallStatsBadges";

interface HeaderProps {
  selectedModelId: string | null;
  showModelSelector: boolean;
  sortedModelStreams: DraftProgress["modelStreams"];
  overallStats: {
    completed: number;
    total: number;
    hasData: boolean;
    wordRange?: string;
    timeRange?: string;
    costRange?: string;
  } | null;
  showCounter: boolean;
  selectedModelsForRun: ModelConfig[];
  uniqueProviders: string[];
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
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
  sortConfig: {
    field: "words" | "time" | "cost" | null;
    direction: "asc" | "desc" | "none";
  };
  onModelSort: (field: "cost" | "context" | "maxOutput") => void;
  onSort: (field: "words" | "time" | "cost") => void;
  onBackToAllModels: () => void;
}

export function Header({
  selectedModelId,
  showModelSelector,
  sortedModelStreams,
  overallStats,
  showCounter,
  selectedModelsForRun,
  uniqueProviders,
  selectedProvider,
  onProviderChange,
  modelMetricRanges,
  modelSortConfig,
  sortConfig,
  onModelSort,
  onSort,
  onBackToAllModels,
}: HeaderProps) {
  return (
    <div className="relative mb-6 flex-shrink-0 flex items-center justify-center h-10">
      {/* Back button for single model view */}
      {selectedModelId &&
        !showModelSelector &&
        sortedModelStreams.length > 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute left-0"
          >
            <button
              onClick={onBackToAllModels}
              className="bg-white/40 hover:bg-white/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-[#000000]/60" />
              <span className="text-sm font-medium text-[#333333]">
                Back to all models
              </span>
            </button>
          </motion.div>
        )}

      <h1 className="text-3xl font-bold text-[#333333] font-atma">Draft Pad</h1>

      {/* Show stats when generating */}
      {overallStats && overallStats.hasData && !showModelSelector && (
        <>
          <div className="absolute right-0 flex items-center gap-2">
            <OverallStatsBadges
              overallStats={overallStats}
              sortConfig={sortConfig}
              onSort={onSort}
            />
          </div>
        </>
      )}

      {showCounter && (
        <>
          {/* Provider filter on the left */}
          <div className="absolute left-0">
            <ProviderFilter
              providers={uniqueProviders}
              selectedProvider={selectedProvider}
              onProviderChange={onProviderChange}
            />
          </div>

          {/* Model selector counter positioned to the right of Draft Pad */}
          <motion.div
            key={selectedModelsForRun.length}
            initial={{ scale: 0.8, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            className="absolute left-[calc(50%+85px)] bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg"
          >
            <span className="text-sm font-medium text-[#333333]">
              {selectedModelsForRun.length} / 9 selected
            </span>
          </motion.div>

          {/* Sort badges on the right */}
          <div className="absolute right-0 flex items-center gap-2">
            <ModelSortBadges
              modelMetricRanges={modelMetricRanges}
              modelSortConfig={modelSortConfig}
              onModelSort={onModelSort}
            />
          </div>
        </>
      )}
    </div>
  );
}
