"use client";

import { type DraftProgress, type ModelConfig } from "@/gensx/workflows";
import { useMemo } from "react";

type SortField = "words" | "time" | "cost";
type SortDirection = "asc" | "desc" | "none";

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

export function useModelStreams(
  draftProgress: DraftProgress | undefined,
  sortConfig: SortConfig,
  modelConfigMap: Map<string, ModelConfig>,
) {
  // Sort model streams by completion status and selected sort field
  const sortedModelStreams = useMemo(() => {
    if (!draftProgress?.modelStreams) return [];

    // If no sort is applied, return the original order
    if (sortConfig.field === null || sortConfig.direction === "none") {
      return [...draftProgress.modelStreams];
    }

    return [...draftProgress.modelStreams].sort((a, b) => {
      // If one is complete and the other isn't, completed ones come first
      if (a.status === "complete" && b.status !== "complete") return -1;
      if (a.status !== "complete" && b.status === "complete") return 1;

      // If both have same completion status, sort by selected field
      let comparison = 0;

      if (sortConfig.field === "words") {
        comparison = a.wordCount - b.wordCount;
      } else if (sortConfig.field === "time") {
        // For time sorting, handle both completed and generating models
        const getEffectiveTime = (stream: typeof a) => {
          if (stream.generationTime !== undefined) {
            return stream.generationTime;
          }
          if (stream.status === "generating" && stream.startTime) {
            return (Date.now() - stream.startTime) / 1000;
          }
          return Infinity; // Put models without time data at the end
        };

        const timeA = getEffectiveTime(a);
        const timeB = getEffectiveTime(b);
        comparison = timeA - timeB;
      } else {
        // Calculate costs for "cost" field
        const configA = modelConfigMap.get(a.modelId);
        const configB = modelConfigMap.get(b.modelId);

        const costA = configA?.cost
          ? ((a.inputTokens ?? 500) / 1_000_000) * configA.cost.input +
            ((a.outputTokens ?? Math.ceil(a.charCount / 4)) / 1_000_000) *
              configA.cost.output
          : Infinity;

        const costB = configB?.cost
          ? ((b.inputTokens ?? 500) / 1_000_000) * configB.cost.input +
            ((b.outputTokens ?? Math.ceil(b.charCount / 4)) / 1_000_000) *
              configB.cost.output
          : Infinity;

        comparison = costA - costB;
      }

      // Apply sort direction
      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [draftProgress?.modelStreams, sortConfig, modelConfigMap]);

  // Calculate min/max values for metrics
  const metricRanges = useMemo(() => {
    if (!sortedModelStreams.length || sortedModelStreams.length < 2) {
      return null; // No metric ranges for single model or no models
    }

    // Word counts
    const wordCounts = sortedModelStreams
      .map((s) => s.wordCount)
      .filter((w) => w > 0);

    // Generation times (only for completed models)
    const times = sortedModelStreams
      .filter((s) => s.generationTime !== undefined)
      .map((s) => s.generationTime!);

    // Calculate costs
    const costs = sortedModelStreams
      .map((s) => {
        const config = modelConfigMap.get(s.modelId);
        if (!config?.cost) return null;

        const inputTokens = s.inputTokens ?? 500;
        const outputTokens = s.outputTokens ?? Math.ceil(s.charCount / 4);

        const inputCost = (inputTokens / 1_000_000) * config.cost.input;
        const outputCost = (outputTokens / 1_000_000) * config.cost.output;
        const totalCost = inputCost + outputCost;
        // Convert to cost per 1000 requests
        return totalCost * 1000;
      })
      .filter((cost): cost is number => cost !== null);

    // Calculate tokens per second
    const tokensPerSecond = sortedModelStreams
      .map((s) => {
        const effectiveTime =
          s.generationTime ??
          (s.status === "generating" && s.startTime
            ? (Date.now() - s.startTime) / 1000
            : null);

        if (!effectiveTime || effectiveTime <= 0) return null;

        const outputTokens = s.outputTokens ?? Math.ceil(s.charCount / 4);
        return outputTokens / effectiveTime;
      })
      .filter((tps): tps is number => tps !== null);

    return {
      minWordCount: wordCounts.length ? Math.min(...wordCounts) : 0,
      maxWordCount: wordCounts.length ? Math.max(...wordCounts) : 0,
      minTime: times.length ? Math.min(...times) : 0,
      maxTime: times.length ? Math.max(...times) : 0,
      minCost: costs.length ? Math.min(...costs) : 0,
      maxCost: costs.length ? Math.max(...costs) : 0,
      minTokensPerSecond: tokensPerSecond.length
        ? Math.min(...tokensPerSecond)
        : 0,
      maxTokensPerSecond: tokensPerSecond.length
        ? Math.max(...tokensPerSecond)
        : 0,
    };
  }, [sortedModelStreams, modelConfigMap]);

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    if (!sortedModelStreams.length) return null;

    const completed = sortedModelStreams.filter(
      (s) => s.status === "complete",
    ).length;
    const total = sortedModelStreams.length;

    // Get ranges for all models (not just completed)
    const activeStreams = sortedModelStreams.filter(
      (s) => s.wordCount > 0 || s.status === "complete",
    );

    if (activeStreams.length === 0) {
      return { completed, total, hasData: false };
    }

    // Word counts
    const wordCounts = activeStreams
      .map((s) => s.wordCount)
      .filter((w) => w > 0);
    const minWords = wordCounts.length ? Math.min(...wordCounts) : 0;
    const maxWords = wordCounts.length ? Math.max(...wordCounts) : 0;

    // Times (for models that have time data)
    const times = sortedModelStreams
      .filter(
        (s) =>
          s.generationTime !== undefined ||
          (s.status === "generating" && s.startTime),
      )
      .map((s) => {
        if (s.generationTime !== undefined) return s.generationTime;
        if (s.startTime) return (Date.now() - s.startTime) / 1000;
        return 0;
      })
      .filter((t) => t > 0);
    const minTime = times.length ? Math.min(...times) : 0;
    const maxTime = times.length ? Math.max(...times) : 0;

    // Costs
    const costs = sortedModelStreams
      .map((s) => {
        const config = modelConfigMap.get(s.modelId);
        if (!config?.cost) return null;

        const inputTokens = s.inputTokens ?? 500;
        const outputTokens = s.outputTokens ?? Math.ceil(s.charCount / 4);

        const inputCost = (inputTokens / 1_000_000) * config.cost.input;
        const outputCost = (outputTokens / 1_000_000) * config.cost.output;
        return (inputCost + outputCost) * 1000; // Per 1000 requests
      })
      .filter((cost): cost is number => cost !== null);

    const minCost = costs.length ? Math.min(...costs) : 0;
    const maxCost = costs.length ? Math.max(...costs) : 0;

    return {
      completed,
      total,
      hasData: true,
      wordRange:
        minWords === maxWords ? `${minWords}` : `${minWords}-${maxWords}`,
      timeRange:
        minTime === maxTime
          ? `${minTime.toFixed(1)}s`
          : `${minTime.toFixed(1)}-${maxTime.toFixed(1)}s`,
      costRange:
        minCost === maxCost
          ? `${minCost.toFixed(2)}/1k`
          : `${minCost.toFixed(2)}-${maxCost.toFixed(2)}/1k`,
    };
  }, [sortedModelStreams, modelConfigMap]);

  return {
    sortedModelStreams,
    metricRanges,
    overallStats,
  };
}
