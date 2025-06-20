"use client";

import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { ModelGridSelector } from "@/components/ui/model-grid-selector";
import { ModelStreamCard } from "@/components/ui/model-stream-card";
import { ProviderFilter } from "@/components/ui/provider-filter";
import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { fetchAvailableModels } from "@/lib/models";
import { useObject, useWorkflow } from "@gensx/react";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Brain,
  Check,
  Clock,
  DollarSign,
  FileText,
  WholeWord,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SortField = "words" | "time" | "cost";
type ModelSortField = "cost" | "context" | "maxOutput";
type SortDirection = "asc" | "desc" | "none";

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

interface ModelSortConfig {
  field: ModelSortField | null;
  direction: SortDirection;
}

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedModelsForRun, setSelectedModelsForRun] = useState<
    ModelConfig[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: "none",
  });
  const [modelSortConfig, setModelSortConfig] = useState<ModelSortConfig>({
    field: null,
    direction: "none",
  });
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

  // Helper function to format numbers with K/M suffixes
  const formatTokenCount = (count: number): string => {
    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1)}M`;
    } else if (count >= 1_000) {
      return `${(count / 1_000).toFixed(0)}K`;
    } else {
      return `${count}`;
    }
  };

  // Fetch available models from models.dev API
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true);
      try {
        const models = await fetchAvailableModels();
        setAvailableModels(models);
      } catch (error) {
        console.error("Failed to load models:", error);
      } finally {
        setIsLoadingModels(false);
      }
    }

    void loadModels();
  }, []);

  const { inProgress, error, execution, run } = useWorkflow<
    UpdateDraftInput,
    UpdateDraftOutput
  >({
    config: {
      baseUrl: "/api/gensx",
    },
  });

  const draftProgress = useObject<DraftProgress>(execution, "draft-progress");

  // Get the selected content for the next iteration
  const selectedContent = useMemo(() => {
    if (!selectedModelId || !draftProgress?.modelStreams.length) {
      return "";
    }

    const selectedStream = draftProgress.modelStreams.find(
      (s) => s.modelId === selectedModelId,
    );
    return selectedStream ? selectedStream.content : "";
  }, [selectedModelId, draftProgress?.modelStreams]);

  const handleSubmit = useCallback(async () => {
    // Use selected models if any, otherwise show error
    if (selectedModelsForRun.length === 0) {
      return;
    }

    // Strip out the 'available' property from models before sending to workflow
    const modelsForWorkflow = selectedModelsForRun.map(
      ({ available, ...model }) => model,
    );

    // Don't reset selection immediately to prevent layout shift
    await run({
      inputs: {
        userMessage: userMessage.trim(),
        currentDraft: selectedContent,
        models: modelsForWorkflow,
      },
    });
    setUserMessage("");
    // Reset selection after a brief delay to allow new streams to initialize
    setTimeout(() => {
      setSelectedModelId(null);
    }, 100);
  }, [run, userMessage, selectedContent, selectedModelsForRun]);

  const onSubmit = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => {
      // If clicking the same field, cycle through states
      if (prev.field === field) {
        if (prev.direction === "asc") {
          return { field, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { field: null, direction: "none" };
        }
      }
      // Start with ascending when clicking a new field
      return { field, direction: "asc" };
    });
  }, []);

  const handleModelSort = useCallback((field: ModelSortField) => {
    setModelSortConfig((prev) => {
      // If clicking the same field, cycle through states
      if (prev.field === field) {
        if (prev.direction === "asc") {
          return { field, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { field: null, direction: "none" };
        }
      }
      // Start with ascending when clicking a new field
      return { field, direction: "asc" };
    });
  }, []);

  // Check if we have completed streams and no selection
  const hasCompletedStreams = draftProgress?.modelStreams.some(
    (s) => s.status === "complete",
  );
  const showSelectionPrompt =
    hasCompletedStreams && !selectedModelId && !inProgress;

  // Show model selector if no streams exist
  const showModelSelector = !draftProgress?.modelStreams.length && !inProgress;

  // Create a map of model configs for easy lookup
  const modelConfigMap = useMemo(() => {
    const map = new Map<string, ModelConfig>();
    selectedModelsForRun.forEach((model) => {
      map.set(model.id, model);
    });
    return map;
  }, [selectedModelsForRun]);

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
    if (!sortedModelStreams.length) {
      return {
        minWordCount: 0,
        maxWordCount: 0,
        minTime: 0,
        maxTime: 0,
        minCost: 0,
        maxCost: 0,
      };
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

    return {
      minWordCount: wordCounts.length ? Math.min(...wordCounts) : 0,
      maxWordCount: wordCounts.length ? Math.max(...wordCounts) : 0,
      minTime: times.length ? Math.min(...times) : 0,
      maxTime: times.length ? Math.max(...times) : 0,
      minCost: costs.length ? Math.min(...costs) : 0,
      maxCost: costs.length ? Math.max(...costs) : 0,
    };
  }, [sortedModelStreams, modelConfigMap]);

  // Determine grid layout based on number of models
  const getGridClassName = (modelCount: number) => {
    if (modelCount >= 7) {
      // 3x3 grid for 7-9 models
      return "grid grid-cols-3 gap-4";
    } else if (modelCount >= 4) {
      // 2x3 grid for 4-6 models
      return "grid grid-cols-2 lg:grid-cols-3 gap-4";
    } else {
      // 1x3 grid for 1-3 models
      return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";
    }
  };

  // Get grid rows class based on number of models
  const getGridRowsClass = (modelCount: number) => {
    if (modelCount >= 7) {
      // 3x3 grid for 7-9 models
      return "grid-rows-3";
    } else if (modelCount >= 4) {
      // 2 rows for 4-6 models
      return "grid-rows-2";
    } else {
      // 1 row for 1-3 models
      return "grid-rows-1";
    }
  };

  // State for showing the counter
  const showCounter = showModelSelector && !isLoadingModels;

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
        comparison = contextA - contextB; // Normal comparison - ascending = smaller first
      } else {
        // maxOutput field
        const outputA = a.limit?.output ?? 0;
        const outputB = b.limit?.output ?? 0;
        comparison = outputA - outputB; // Normal comparison - ascending = smaller first
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

  // Get unique providers
  const uniqueProviders = useMemo(() => {
    const providers = new Set(
      availableModels
        .filter((m) => m.providerName) // Only include models with provider names
        .map((m) => m.providerName!),
    );
    return Array.from(providers).sort();
  }, [availableModels]);

  return (
    <div className="flex-1 flex flex-col h-screen p-6">
      {/* Header with centered Draft Pad title and counter */}
      <div className="relative mb-6 flex-shrink-0 flex items-center justify-center h-10">
        <h1 className="text-3xl font-bold text-[#333333] font-atma">
          Draft Pad
        </h1>
        {overallStats && overallStats.hasData && !showModelSelector && (
          <>
            {/* Completed badge positioned to the right of Draft Pad */}
            <motion.div
              key={overallStats.completed}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
              }}
              className="absolute left-[calc(50%+85px)] bg-white/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5"
            >
              {overallStats.completed === overallStats.total ? (
                <Check className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-blue-600"></div>
              )}
              <span className="text-sm font-medium text-[#333333]">
                {overallStats.completed}/{overallStats.total} done
              </span>
            </motion.div>
            {/* Sort filter badges on the right */}
            <div className="absolute right-0 flex items-center gap-2">
              {/* Word range badge */}
              <button
                onClick={() => {
                  handleSort("words");
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
                  handleSort("time");
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
                  handleSort("cost");
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
                onProviderChange={setSelectedProvider}
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
              {/* Combined Cost badge */}
              <button
                onClick={() => {
                  handleModelSort("cost");
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
                  handleModelSort("context");
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
                  handleModelSort("maxOutput");
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
            </div>
          </>
        )}
      </div>

      {/* Model selector - fills remaining space */}
      {showModelSelector && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
              onModelsChange={setSelectedModelsForRun}
              maxModels={9}
            />
          )}
        </div>
      )}

      {/* Model streams section - adaptive grid layout */}
      {!showModelSelector && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {sortedModelStreams.length > 0 ? (
            <motion.div
              className={`${getGridClassName(sortedModelStreams.length)} ${getGridRowsClass(sortedModelStreams.length)} flex-1 min-h-0 auto-rows-fr`}
              layout
            >
              <AnimatePresence mode="popLayout">
                {sortedModelStreams.map((modelStream) => {
                  return (
                    <motion.div
                      key={modelStream.modelId}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{
                        layout: {
                          type: "spring",
                          bounce: 0.3,
                          duration: 0.7,
                        },
                        opacity: { duration: 0.2 },
                        scale: { duration: 0.2 },
                      }}
                      className="min-h-0 flex"
                    >
                      <ModelStreamCard
                        modelStream={modelStream}
                        modelConfig={modelConfigMap.get(modelStream.modelId)}
                        isSelected={selectedModelId === modelStream.modelId}
                        onSelect={() => {
                          handleModelSelect(modelStream.modelId);
                        }}
                        scrollPosition={scrollPosition}
                        onScrollUpdate={setScrollPosition}
                        metricRanges={metricRanges}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
              <div className="flex items-center justify-center text-[#333333]/60 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="text-lg mb-2">Ready to generate content</div>
                  <div className="text-sm">Select models above to start</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input section - always at bottom */}
      <div className="flex-shrink-0 mt-6 flex justify-center">
        <DraftEditorCard
          output={selectedContent}
          isStreaming={inProgress}
          error={error}
          userMessage={userMessage}
          onUserMessageChange={setUserMessage}
          onSubmit={onSubmit}
          className="w-full max-w-3xl"
          disabled={
            (showModelSelector && selectedModelsForRun.length === 0) ||
            showSelectionPrompt
          }
          placeholder={
            showModelSelector && selectedModelsForRun.length === 0
              ? "Select models to start..."
              : showSelectionPrompt
                ? "Select an output above to continue..."
                : undefined
          }
        />
      </div>
    </div>
  );
}
