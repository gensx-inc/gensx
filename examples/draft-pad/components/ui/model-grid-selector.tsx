"use client";

import { type ModelConfig } from "@/gensx/workflows";
import { Check } from "lucide-react";

import { ModelInfo } from "./model-info";
import { ProviderIcon } from "./provider-icon";

interface ModelGridSelectorProps {
  availableModels: ModelConfig[];
  selectedModels: ModelConfig[];
  onModelsChange: (models: ModelConfig[]) => void;
  maxModels?: number;
}

export function ModelGridSelector({
  availableModels,
  selectedModels,
  onModelsChange,
  maxModels = 9,
}: ModelGridSelectorProps) {
  const handleModelToggle = (model: ModelConfig) => {
    const isSelected = selectedModels.some((m) => m.id === model.id);

    if (isSelected) {
      // Remove model
      onModelsChange(selectedModels.filter((m) => m.id !== model.id));
    } else if (selectedModels.length < maxModels && model.available) {
      // Add model
      onModelsChange([...selectedModels, model]);
    }
  };

  const isModelSelected = (model: ModelConfig) => {
    return selectedModels.some((m) => m.id === model.id);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
          {availableModels.map((model) => {
            const isSelected = isModelSelected(model);
            const isDisabled =
              !model.available ||
              (!isSelected && selectedModels.length >= maxModels);

            return (
              <button
                key={model.id}
                onClick={() => {
                  handleModelToggle(model);
                }}
                disabled={isDisabled}
                className={`
                  relative p-4 rounded-2xl text-left transition-all duration-200
                  ${
                    isSelected
                      ? "bg-white/40 backdrop-blur-[8px] shadow-[0_4px_16px_rgba(0,0,0,0.1),inset_1px_1px_1px_0_rgba(255,255,255,0.5)] ring-2 ring-blue-500"
                      : "bg-white/20 backdrop-blur-[3px] shadow-[0_2px_8px_rgba(0,0,0,0.05),inset_1px_1px_1px_0_rgba(255,255,255,0.3)]"
                  }
                  ${
                    isDisabled
                      ? "cursor-not-allowed"
                      : "hover:bg-white/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1),inset_1px_1px_1px_0_rgba(255,255,255,0.4)]"
                  }
                `}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                {/* Model info */}
                <div
                  className={`space-y-2 ${!model.available ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <ProviderIcon
                      provider={model.provider}
                      className="w-6 h-6 flex-shrink-0"
                    />
                    <span className="text-[10px] text-[#333333]/50">
                      {model.provider}
                    </span>
                  </div>
                  <div className="font-medium text-sm text-[#333333] text-center truncate px-1">
                    {model.model}
                  </div>
                  <ModelInfo model={model} showIcon={false} className="px-2" />
                  {!model.available && (
                    <div className="text-xs text-gray-500 text-center">
                      🔒 API key required
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
