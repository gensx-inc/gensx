"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ModelConfig } from "@/gensx/workflows";

interface ModelSelectorProps {
  availableModels: ModelConfig[];
  selectedModels: ModelConfig[];
  onModelsChange: (models: ModelConfig[]) => void;
  maxModels?: number;
}

export function ModelSelector({
  availableModels,
  selectedModels,
  onModelsChange,
  maxModels = 3,
}: ModelSelectorProps) {
  const handleAddModel = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model && selectedModels.length < maxModels) {
      onModelsChange([...selectedModels, model]);
    }
  };

  const handleModelChange = (index: number, modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (model) {
      const newModels = [...selectedModels];
      newModels[index] = model;
      onModelsChange(newModels);
    }
  };

  // Get available models that aren't already selected
  const getAvailableModelsForSelect = (currentIndex?: number) => {
    return availableModels.filter(
      (model) =>
        !selectedModels.some(
          (selected, index) =>
            selected.id === model.id && index !== currentIndex,
        ),
    );
  };

  return (
    <div className="space-y-4 p-6 rounded-3xl bg-white/10 backdrop-blur-[3px] shadow-[0_6px_6px_rgba(0,0,0,0.1),inset_2px_2px_1px_0_rgba(255,255,255,0.3),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.3)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-medium text-[#333333]">
          Select Models to Compare
        </h3>
        <span className="text-sm text-[#333333]/60">
          {selectedModels.length} / {maxModels} models selected
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: maxModels }).map((_, index) => {
          const selectedModel = selectedModels[index];
          const availableForThisSlot = getAvailableModelsForSelect(index);

          return (
            <div
              key={index}
              className="border-2 border-dashed border-[#333333]/20 rounded-2xl p-4 bg-white/5"
            >
              {selectedModel ? (
                <Select
                  value={selectedModel.id}
                  onValueChange={(value) => {
                    handleModelChange(index, value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      selectedModel,
                      ...availableForThisSlot.filter(
                        (m) => m.id !== selectedModel.id,
                      ),
                    ].map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value=""
                  onValueChange={(value) => {
                    handleAddModel(value);
                  }}
                  disabled={availableForThisSlot.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForThisSlot.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-[#333333]/60">
          Select up to {maxModels} models to compare their outputs
        </p>
      </div>
    </div>
  );
}
