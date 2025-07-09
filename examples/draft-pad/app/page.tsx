"use client";

import { Header } from "@/components/Header";
import { InputSection } from "@/components/InputSection";
import { ModelSelectorView } from "@/components/ModelSelectorView";
import { ModelStreamView } from "@/components/ModelStreamView";
import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { fetchAvailableModels } from "@/lib/models";
import { type ContentVersion } from "@/lib/types";
import { useObject, useWorkflow } from "@gensx/react";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelsForRun, setSelectedModelsForRun] = useState<
    ModelConfig[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: "none",
  });
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [modelSortConfig, setModelSortConfig] = useState<ModelSortConfig>({
    field: null,
    direction: "none",
  });
  const [showModelSelectorView, setShowModelSelectorView] = useState(false);

  // Version history state
  const [versionHistory, setVersionHistory] = useState<
    Record<string, ContentVersion[]>
  >({});

  // Simpler diff state management
  const [showDiff, setShowDiff] = useState(false);
  const [autoShowDiff, setAutoShowDiff] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const showDiffRef = useRef(showDiff);

  // Keep ref in sync with state
  useEffect(() => {
    showDiffRef.current = showDiff;
  }, [showDiff]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }
    };
  }, []);

  const isDiffVisible = showDiff || autoShowDiff;

  const toggleDiff = useCallback(() => {
    // Clear any auto-hide timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }

    // If manually showing, hide it
    if (showDiff) {
      setShowDiff(false);
      setAutoShowDiff(false);
    } else {
      // Otherwise, show it manually
      setShowDiff(true);
      setAutoShowDiff(false);
    }
  }, [showDiff]);

  const showAutoCompletion = useCallback(() => {
    if (!showDiff) {
      setAutoShowDiff(true);

      // Clear any existing timer
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
      }

      // Hide after 3 seconds (but only if manual diff is not enabled)
      autoHideTimerRef.current = setTimeout(() => {
        // Only hide auto diff if manual diff is not enabled
        if (!showDiffRef.current) {
          setAutoShowDiff(false);
        }
        autoHideTimerRef.current = null;
      }, 3000);
    }
  }, [showDiff]);

  const resetDiff = useCallback(() => {
    // Clear any existing timer
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    setAutoShowDiff(false);
  }, []);

  const [defaultModelId] = useState(
    "groq-meta-llama/llama-4-maverick-17b-128e-instruct",
  );

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Fetch available models from models.dev API
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true);
      try {
        const models = await fetchAvailableModels();
        console.log("Loaded models:", models.length, "total");
        const availableModels = models.filter((m) => m.available);
        console.log("Available models:", availableModels.length);
        setAvailableModels(models);

        // Always set a default model if we don't have any selected
        if (selectedModelsForRun.length === 0) {
          const defaultModel = models.find(
            (m) => m.id === defaultModelId && m.available,
          );
          if (defaultModel) {
            console.log("Setting default model:", defaultModel.displayName);
            setSelectedModelsForRun([defaultModel]);
          } else {
            // Fallback to first available model if default isn't found
            const firstAvailable = models.find((m) => m.available);
            if (firstAvailable) {
              console.log(
                "Setting fallback model:",
                firstAvailable.displayName,
              );
              setSelectedModelsForRun([firstAvailable]);
            } else {
              // If no models are available, create a simple OpenAI fallback
              const fallbackModel = {
                id: "gpt-4o-mini-fallback",
                provider: "openai" as const,
                model: "gpt-4o-mini",
                displayName: "GPT-4o Mini (Fallback)",
                available: true,
              };
              console.log(
                "No available models found, using fallback:",
                fallbackModel.displayName,
              );
              setSelectedModelsForRun([fallbackModel]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load models:", error);
        // If model loading fails completely, use a basic OpenAI model
        const fallbackModel = {
          id: "gpt-4o-mini-emergency",
          provider: "openai" as const,
          model: "gpt-4o-mini",
          displayName: "GPT-4o Mini (Emergency Fallback)",
          available: true,
        };
        console.log("Emergency fallback model:", fallbackModel.displayName);
        setSelectedModelsForRun([fallbackModel]);
      } finally {
        setIsLoadingModels(false);
      }
    }

    void loadModels();
  }, [defaultModelId]); // Add defaultModelId as dependency

  const {
    inProgress: workflowInProgress,
    error: _workflowError,
    execution,
    run,
  } = useWorkflow<UpdateDraftInput, UpdateDraftOutput>({
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

    // Strip out the 'available' and 'reasoning' properties from models before sending to workflow
    const modelsForWorkflow = selectedModelsForRun.map(
      ({ available, reasoning, ...model }) => model,
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
    // Always hide model selector view when submitting
    setShowModelSelectorView(false);
    // Clear selected model to show all models during generation
    setSelectedModelId(null);
    // Reset diff state for new generation
    resetDiff();
    void handleSubmit();
  }, [handleSubmit, resetDiff]);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  // Add new content to version history
  const addVersionToHistory = useCallback(
    (modelId: string, content: string) => {
      setVersionHistory((prev) => {
        const modelVersions = prev[modelId] ?? [];
        const newVersion: ContentVersion = {
          id: `${modelId}-v${modelVersions.length + 1}`,
          version: modelVersions.length + 1,
          content,
          modelId,
          timestamp: new Date(),
        };

        const updatedVersions = [...modelVersions, newVersion];

        return {
          ...prev,
          [modelId]: updatedVersions,
        };
      });
    },
    [],
  );

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

  // Save completed streams to version history
  useEffect(() => {
    if (!draftProgress?.modelStreams) return;

    draftProgress.modelStreams.forEach((stream) => {
      if (stream.status === "complete" && stream.content) {
        // Check if this content is already in history (to avoid duplicates)
        const modelHistory = versionHistory[stream.modelId] ?? [];
        const lastVersion = modelHistory[modelHistory.length - 1];

        if (
          modelHistory.length === 0 ||
          lastVersion.content !== stream.content
        ) {
          addVersionToHistory(stream.modelId, stream.content);
        }
      }
    });
  }, [draftProgress?.modelStreams, versionHistory, addVersionToHistory]);

  // Show auto diff when all models complete
  const prevGeneratingRef = useRef(false);

  if (draftProgress?.modelStreams) {
    const hasGenerating = draftProgress.modelStreams.some(
      (stream) => stream.status === "generating",
    );
    const hasCompleted = draftProgress.modelStreams.some(
      (stream) => stream.status === "complete",
    );

    // Show auto diff when transitioning from generating to all completed
    if (prevGeneratingRef.current && !hasGenerating && hasCompleted) {
      showAutoCompletion();
    }

    prevGeneratingRef.current = hasGenerating;
  }

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
  const completedStreams =
    draftProgress?.modelStreams.filter((s) => s.status === "complete") ?? [];

  // Auto-select single model when there's only one completed stream
  useEffect(() => {
    if (
      completedStreams.length === 1 &&
      !selectedModelId &&
      !workflowInProgress
    ) {
      setSelectedModelId(completedStreams[0].modelId);
    }
  }, [
    completedStreams.length,
    completedStreams[0]?.modelId,
    selectedModelId,
    workflowInProgress,
  ]);

  const showSelectionPrompt =
    hasCompletedStreams &&
    !selectedModelId &&
    !workflowInProgress &&
    completedStreams.length > 1;

  // Show model selector based on view state
  const showModelSelector = showModelSelectorView;

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

  const focusInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div
      className="flex-1 flex flex-col h-screen pt-6 px-6"
      style={{ scrollBehavior: "auto" }}
    >
      {/* Header */}
      <Header
        selectedModelId={selectedModelId}
        showModelSelector={showModelSelector}
        sortedModelStreams={sortedModelStreams}
        overallStats={overallStats}
        showCounter={showCounter}
        selectedModelsForRun={selectedModelsForRun}
        uniqueProviders={uniqueProviders}
        selectedProvider={selectedProvider}
        onProviderChange={setSelectedProvider}
        modelMetricRanges={modelMetricRanges}
        modelSortConfig={modelSortConfig}
        sortConfig={sortConfig}
        showDiff={showDiff}
        autoShowDiff={autoShowDiff}
        onToggleDiff={toggleDiff}
        onModelSort={handleModelSort}
        onSort={handleSort}
        onBackToAllModels={() => {
          setSelectedModelId(null);
        }}
      />

      {/* Full screen model selector view */}
      {showModelSelector && (
        <ModelSelectorView
          isLoadingModels={isLoadingModels}
          sortedAvailableModels={sortedAvailableModels}
          selectedModelsForRun={selectedModelsForRun}
          onModelsChange={setSelectedModelsForRun}
          onClose={() => {
            setShowModelSelectorView(false);
          }}
          focusInput={focusInput}
        />
      )}

      {/* Main content area */}
      {!showModelSelector && (
        <>
          {/* If no model streams, show initial centered view */}
          {sortedModelStreams.length === 0 && !workflowInProgress ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Empty space for centering - input will be positioned at bottom */}
            </div>
          ) : (
            /* Generation view with model streams */
            <ModelStreamView
              selectedModelId={selectedModelId}
              sortedModelStreams={sortedModelStreams}
              modelConfigMap={modelConfigMap}
              versionHistory={versionHistory}
              isDiffVisible={isDiffVisible}
              metricRanges={metricRanges}
              onModelSelect={handleModelSelect}
            />
          )}

          {/* Unified input section - transitions from center to bottom */}
          <InputSection
            userMessage={userMessage}
            selectedModelsForRun={selectedModelsForRun}
            sortedAvailableModels={sortedAvailableModels}
            isMultiSelectMode={isMultiSelectMode}
            showSelectionPrompt={showSelectionPrompt ?? false}
            workflowInProgress={workflowInProgress}
            sortedModelStreamsLength={sortedModelStreams.length}
            isDropdownOpen={isDropdownOpen}
            textareaRef={textareaRef as RefObject<HTMLTextAreaElement>}
            inputRef={inputRef as RefObject<HTMLInputElement>}
            onUserMessageChange={setUserMessage}
            onMultiSelectModeChange={setIsMultiSelectMode}
            onModelsChange={setSelectedModelsForRun}
            onDropdownOpenChange={setIsDropdownOpen}
            onSubmit={onSubmit}
          />
        </>
      )}
    </div>
  );
}
