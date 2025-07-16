"use client";

import { type ModelConfig } from "@/gensx/workflows";
import { useMemo } from "react";

type ModelSortField = "cost" | "context" | "maxOutput";
type SortDirection = "asc" | "desc" | "none";

interface ModelSortConfig {
  field: ModelSortField | null;
  direction: SortDirection;
}

export function useAvailableModels(
  availableModels: ModelConfig[],
  modelSortConfig: ModelSortConfig,
  selectedProvider: string,
) {
  // Sort available models based on selected sort field
  const sortedAvailableModels = useMemo(() => {
    if (!availableModels.length) return [];

    // Filter by provider first
    const filtered =
      selectedProvider === "all"
        ? availableModels
        : availableModels.filter((m) => m.providerName === selectedProvider);

    // If no sort is applied, return the filtered models in original order
    if (
      modelSortConfig.field === null ||
      modelSortConfig.direction === "none"
    ) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (modelSortConfig.field === "cost") {
        const costA = (a.cost?.input ?? 0) + (a.cost?.output ?? 0);
        const costB = (b.cost?.input ?? 0) + (b.cost?.output ?? 0);
        comparison = costA - costB;
      } else if (modelSortConfig.field === "context") {
        const contextA = a.limit?.context ?? 0;
        const contextB = b.limit?.context ?? 0;
        comparison = contextA - contextB;
      } else {
        // maxOutput field
        const outputA = a.limit?.output ?? 0;
        const outputB = b.limit?.output ?? 0;
        comparison = outputA - outputB;
      }

      // Apply sort direction
      return modelSortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [availableModels, modelSortConfig, selectedProvider]);

  // Calculate model metric ranges
  const modelMetricRanges = useMemo(() => {
    if (!availableModels.length) {
      return {
        minCost: 0,
        maxCost: 0,
        minContext: 0,
        maxContext: 0,
        minMaxOutput: 0,
        maxMaxOutput: 0,
      };
    }

    // Combined costs (input + output)
    const costs = availableModels
      .filter((m) => m.cost !== undefined)
      .map((m) => m.cost!.input + m.cost!.output);

    const contexts = availableModels
      .filter((m) => m.limit?.context !== undefined)
      .map((m) => m.limit!.context);
    const maxOutputs = availableModels
      .filter((m) => m.limit?.output !== undefined)
      .map((m) => m.limit!.output);

    return {
      minCost: costs.length ? Math.min(...costs) : 0,
      maxCost: costs.length ? Math.max(...costs) : 0,
      minContext: contexts.length ? Math.min(...contexts) : 0,
      maxContext: contexts.length ? Math.max(...contexts) : 0,
      minMaxOutput: maxOutputs.length ? Math.min(...maxOutputs) : 0,
      maxMaxOutput: maxOutputs.length ? Math.max(...maxOutputs) : 0,
    };
  }, [availableModels]);

  return {
    sortedAvailableModels,
    modelMetricRanges,
  };
}
