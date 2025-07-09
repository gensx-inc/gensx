"use client";

import { ModelGridSelector } from "@/components/ui/model-grid-selector";
import { type ModelConfig } from "@/gensx/workflows";
import { ArrowLeft } from "lucide-react";

interface ModelSelectorViewProps {
  isLoadingModels: boolean;
  sortedAvailableModels: ModelConfig[];
  selectedModelsForRun: ModelConfig[];
  onModelsChange: (models: ModelConfig[]) => void;
  onClose: () => void;
  focusInput: () => void;
}

export function ModelSelectorView({
  isLoadingModels,
  sortedAvailableModels,
  selectedModelsForRun,
  onModelsChange,
  onClose,
  focusInput,
}: ModelSelectorViewProps) {
  const handleClose = () => {
    onClose();
    // Focus input after closing model selector
    setTimeout(() => {
      focusInput();
    }, 100);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Header with back button and done button */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={handleClose}
          className="flex items-center gap-2 text-[#333333]/70 hover:text-[#333333] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <button
          onClick={handleClose}
          className="relative rounded-xl overflow-hidden shadow-[0_2px_2px_rgba(0,0,0,0.1),0_0_10px_rgba(0,0,0,0.05)] transition-all duration-400 ease-out backdrop-blur-[3px] bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-medium text-[#333333] disabled:opacity-50"
          disabled={selectedModelsForRun.length === 0}
        >
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.3)]" />
          <span className="relative z-[2]">
            Done ({selectedModelsForRun.length} selected)
          </span>
        </button>
      </div>

      {isLoadingModels ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-lg text-[#333333]/60">
            Loading available models from models.dev...
          </div>
        </div>
      ) : (
        <ModelGridSelector
          availableModels={sortedAvailableModels}
          selectedModels={selectedModelsForRun}
          onModelsChange={onModelsChange}
          maxModels={9}
        />
      )}
    </div>
  );
}
