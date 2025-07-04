"use client";

import { ModelGridSelector } from "@/components/ui/model-grid-selector";
import { ModelStreamCard } from "@/components/ui/model-stream-card";
import { ProviderFilter } from "@/components/ui/provider-filter";
import { ProviderIcon } from "@/components/ui/provider-icon";
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
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  Brain,
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  FileText,
  Send,
  WholeWord,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  const [defaultModelId] = useState(
    "groq/meta-llama/llama-4-maverick-17b-128e-instruct",
  );

  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Ref to store list container and its scroll position
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      const dropdown = target.closest(".model-dropdown-container");
      if (!dropdown && isDropdownOpen) {
        setIsDropdownOpen(false);
        setDropdownSearch("");
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isDropdownOpen]);

  // Auto-resize textarea function
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    const minHeight = 72; // Increased to account for padding (24px top + 24px bottom + ~24px for text)
    const maxHeight = 300;

    // Get current height to avoid unnecessary changes
    const currentHeight = parseInt(textarea.style.height) || minHeight;

    // Save the current scroll position
    const scrollTop = textarea.scrollTop;

    // Temporarily shrink to minimum to get accurate scrollHeight
    textarea.style.height = `${minHeight}px`;

    // Get the content height
    const contentHeight = textarea.scrollHeight;

    // Calculate new height within bounds
    const newHeight = Math.max(minHeight, Math.min(contentHeight, maxHeight));

    // Only apply if height actually changed to prevent unnecessary updates
    if (newHeight !== currentHeight) {
      textarea.style.height = `${newHeight}px`;
    } else {
      // Restore the original height if no change needed
      textarea.style.height = `${currentHeight}px`;
    }

    // Restore scroll position
    textarea.scrollTop = scrollTop;
  };

  // Disable smooth scrolling when dropdown is open
  useEffect(() => {
    if (isDropdownOpen) {
      // Store original scroll behavior
      const originalStyle = document.documentElement.style.scrollBehavior;
      // Disable smooth scrolling
      document.documentElement.style.scrollBehavior = "auto";

      return () => {
        // Restore original scroll behavior
        document.documentElement.style.scrollBehavior = originalStyle;
      };
    }
  }, [isDropdownOpen]);

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
    void handleSubmit();
  }, [handleSubmit]);

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

        if (!lastVersion || lastVersion.content !== stream.content) {
          addVersionToHistory(stream.modelId, stream.content);
        }
      }
    });
  }, [draftProgress?.modelStreams, versionHistory, addVersionToHistory]);

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
    if (modelCount <= 2) return "grid-rows-1";
    if (modelCount <= 4) return "grid-rows-2";
    if (modelCount <= 6) return "grid-rows-2";
    return "grid-rows-3";
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

  // Model dropdown component
  const ModelDropdown = ({
    direction = "up",
  }: {
    direction?: "up" | "down";
  }) => {
    const filteredModels = useMemo(() => {
      if (!dropdownSearch) return sortedAvailableModels;
      const search = dropdownSearch.toLowerCase();
      return sortedAvailableModels.filter(
        (model) =>
          model.displayName?.toLowerCase().includes(search) ||
          model.model.toLowerCase().includes(search) ||
          model.provider?.toLowerCase().includes(search),
      );
    }, [dropdownSearch, sortedAvailableModels]);

    return (
      <div
        className="relative model-dropdown-container"
        data-state={isDropdownOpen ? "open" : "closed"}
        key="model-dropdown"
      >
        {/* Dropdown trigger */}
        <div className="relative">
          <button
            onClick={() => {
              setIsDropdownOpen(!isDropdownOpen);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onFocus={(e) => {
              e.preventDefault();
              e.currentTarget.blur();
            }}
            type="button"
            className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-transparent hover:bg-white/10 transition-colors"
          >
            <div className="min-w-0 ">
              {selectedModelsForRun.length === 0 ? (
                <span className="text-sm text-[#333333]/50">
                  Select models...
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {selectedModelsForRun.map((model) => (
                    <span
                      key={model.id}
                      className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333] whitespace-nowrap flex items-center gap-1"
                    >
                      {model.displayName?.split(" (")[0] ?? model.model}
                      {model.reasoning && <Brain className="w-3 h-3" />}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[#333333]/50 transition-transform flex-shrink-0 ml-2 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div
            className={`absolute left-0 z-[9999] ${direction === "up" ? "bottom-full mb-2" : "top-full mt-2"} rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] min-w-[300px] max-w-[90vw] w-auto`}
          >
            {/* Glass background with strong blur */}
            <div className="absolute inset-0 rounded-2xl bg-white/20 backdrop-blur-xl" />

            {/* Glass effect border */}
            <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)]" />

            <div className="relative z-[2]">
              {/* Header with selected count */}
              <div className="p-3 border-b border-white/20 ">
                <div className="flex items-center justify-center">
                  <span className="text-sm font-medium text-[#333333]">
                    {selectedModelsForRun.length}/9 models selected
                  </span>
                </div>
              </div>

              {/* Model list */}
              <div
                ref={listContainerRef}
                className="max-h-96 overflow-y-auto"
                onScroll={(e) => {
                  e.stopPropagation();
                }}
              >
                {filteredModels.length > 0 ? (
                  <div className="p-2">
                    {filteredModels.map((model) => {
                      const isSelected = selectedModelsForRun.some(
                        (m) => m.id === model.id,
                      );
                      const isDisabled =
                        !isSelected && selectedModelsForRun.length >= 9;

                      return (
                        <button
                          key={model.id}
                          type="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!model.available) return;

                            // capture scroll position before state updates
                            if (listContainerRef.current) {
                              lastScrollTopRef.current =
                                listContainerRef.current.scrollTop;
                            }

                            if (isSelected) {
                              setSelectedModelsForRun(
                                selectedModelsForRun.filter(
                                  (m) => m.id !== model.id,
                                ),
                              );
                            } else if (selectedModelsForRun.length < 9) {
                              setSelectedModelsForRun([
                                ...selectedModelsForRun,
                                model,
                              ]);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onFocus={(e) => {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }}
                          disabled={isDisabled || !model.available}
                          className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors ${
                            isDisabled || !model.available
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:bg-black/10"
                          } ${isSelected ? "bg-black/10" : ""}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {/* Provider icon */}
                            <ProviderIcon
                              provider={model.provider}
                              className="w-5 h-5 flex-shrink-0"
                            />

                            {/* Model info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-sm font-medium truncate ${model.available ? "text-[#333333]" : "text-[#333333]/50"}`}
                                >
                                  {model.displayName?.split(" (")[0] ??
                                    model.model}
                                </span>
                                {/* Reasoning model indicator */}
                                {model.reasoning && (
                                  <Brain className="w-3.5 h-3.5 text-[#333333] flex-shrink-0" />
                                )}
                              </div>
                            </div>

                            {/* Data badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Input cost badge */}
                              <span
                                className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333]/70"
                                title="Cost per million input tokens"
                              >
                                ${model.cost?.input.toFixed(2) ?? "0.00"}/M in
                              </span>

                              {/* Output cost badge */}
                              <span
                                className="px-2 py-0.5 rounded-full bg-black/10 text-xs text-[#333333]/70"
                                title="Cost per million output tokens"
                              >
                                ${model.cost?.output.toFixed(2) ?? "0.00"}/M out
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-[#333333]/70">
                    No models found
                  </div>
                )}
              </div>

              {/* Search bar at bottom */}
              <div className="p-3 border-t border-white/20">
                <input
                  type="text"
                  value={dropdownSearch}
                  onChange={(e) => {
                    setDropdownSearch(e.target.value);
                  }}
                  placeholder="Search models..."
                  className="w-full px-3 py-2 bg-white/20 backdrop-blur-sm rounded-md outline-none focus:ring-2 focus:ring-white/30 text-sm placeholder-black/50 text-[#333333]"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Restore list scroll after selection updates
  useLayoutEffect(() => {
    if (isDropdownOpen && listContainerRef.current) {
      listContainerRef.current.scrollTop = lastScrollTopRef.current;
    }
  }, [selectedModelsForRun.length, isDropdownOpen]);

  // Initialize textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      // Set initial properties for smooth auto-resize
      textarea.style.height = "72px";
      textarea.style.transition = "height 0.1s ease";
      textarea.style.boxSizing = "border-box";
    }
  }, []);

  return (
    <div
      className="flex-1 flex flex-col h-screen pt-6 px-6"
      style={{ scrollBehavior: "auto" }}
    >
      {/* Header with centered Draft Pad title */}
      <div className="relative mb-6 flex-shrink-0 flex items-center justify-center h-10">
        {/* Back button for single model view */}
        {selectedModelId && !showModelSelector && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute left-0"
          >
            <button
              onClick={() => {
                setSelectedModelId(null);
              }}
              className="flex items-center gap-2 text-[#333333]/70 hover:text-[#333333] transition-colors px-3 py-2 rounded-xl hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">
                Back to all model outputs
              </span>
            </button>
          </motion.div>
        )}

        <h1 className="text-3xl font-bold text-[#333333] font-atma">
          Draft Pad
        </h1>

        {/* Show stats when generating */}
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

      {/* Full screen model selector view */}
      {showModelSelector && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Header with back button and done button */}
          <div className="mb-4 flex justify-between items-center">
            <button
              onClick={() => {
                setShowModelSelectorView(false);
              }}
              className="flex items-center gap-2 text-[#333333]/70 hover:text-[#333333] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back</span>
            </button>

            <button
              onClick={() => {
                setShowModelSelectorView(false);
              }}
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
              onModelsChange={(models) => {
                setSelectedModelsForRun(models);
              }}
              maxModels={9}
            />
          )}
        </div>
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
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Show single selected model or grid */}
              <AnimatePresence mode="wait">
                {selectedModelId ? (
                  /* Single selected model view */
                  <motion.div
                    key="single-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 flex flex-col min-h-0"
                  >
                    {/* Single model card */}
                    <motion.div
                      layout
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 25,
                        duration: 0.6,
                      }}
                      className="flex-1 flex justify-center min-h-0"
                    >
                      <div className="w-full max-w-3xl min-h-0 flex">
                        {(() => {
                          const selectedStream = sortedModelStreams.find(
                            (s) => s.modelId === selectedModelId,
                          );
                          return selectedStream ? (
                            <ModelStreamCard
                              modelStream={selectedStream}
                              modelConfig={modelConfigMap.get(
                                selectedStream.modelId,
                              )}
                              isSelected={true}
                              onSelect={undefined}
                              metricRanges={metricRanges}
                            />
                          ) : null;
                        })()}
                      </div>
                    </motion.div>
                  </motion.div>
                ) : (
                  /* Grid view of all models */
                  <motion.div
                    key="grid-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex-1 min-h-0 flex flex-col"
                  >
                    {sortedModelStreams.length === 1 ? (
                      /* Single model - full height with overflow */
                      <motion.div
                        layout
                        className="flex-1 flex justify-center min-h-0"
                      >
                        <div className="w-full max-w-3xl min-h-0 flex">
                          <ModelStreamCard
                            modelStream={sortedModelStreams[0]}
                            modelConfig={modelConfigMap.get(
                              sortedModelStreams[0].modelId,
                            )}
                            isSelected={false}
                            onSelect={() => {
                              handleModelSelect(sortedModelStreams[0].modelId);
                            }}
                            metricRanges={metricRanges}
                          />
                        </div>
                      </motion.div>
                    ) : (
                      /* Multiple models - grid layout */
                      <motion.div
                        layout
                        className={`${getGridClassName(sortedModelStreams.length)} ${getGridRowsClass(sortedModelStreams.length)} flex-1 min-h-0 auto-rows-fr`}
                      >
                        <AnimatePresence mode="popLayout">
                          {sortedModelStreams.map((modelStream, index) => {
                            return (
                              <motion.div
                                key={modelStream.modelId}
                                layout
                                layoutId={`model-${modelStream.modelId}`}
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                                whileHover={{
                                  scale: 1.02,
                                  transition: { duration: 0.2 },
                                }}
                                whileTap={{ scale: 0.98 }}
                                transition={{
                                  layout: {
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 25,
                                    duration: 0.6,
                                  },
                                  opacity: {
                                    duration: 0.6,
                                    delay: index * 0.1,
                                  },
                                  scale: {
                                    duration: 0.6,
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 20,
                                  },
                                  y: {
                                    duration: 0.6,
                                    delay: index * 0.1,
                                    type: "spring",
                                    stiffness: 200,
                                    damping: 20,
                                  },
                                }}
                                className="min-h-0 flex"
                              >
                                <ModelStreamCard
                                  modelStream={modelStream}
                                  modelConfig={modelConfigMap.get(
                                    modelStream.modelId,
                                  )}
                                  isSelected={
                                    selectedModelId === modelStream.modelId
                                  }
                                  onSelect={() => {
                                    handleModelSelect(modelStream.modelId);
                                  }}
                                  metricRanges={metricRanges}
                                />
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Unified input section - transitions from center to bottom */}
          <motion.div
            layout
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 25,
              duration: 1.2,
            }}
            className={`flex-shrink-0 flex justify-center ${
              sortedModelStreams.length === 0 && !workflowInProgress
                ? "absolute inset-0 items-center"
                : "mt-6"
            }`}
            style={
              sortedModelStreams.length === 0 && !workflowInProgress
                ? { zIndex: 10 }
                : {}
            }
          >
            <motion.div layout className="w-full max-w-3xl">
              <motion.div
                layout
                className={`relative overflow-visible shadow-[0_4px_24px_rgba(0,0,0,0.12),0_0_48px_rgba(0,0,0,0.08)] bg-white/40 ${
                  isDropdownOpen ? "" : "backdrop-blur-sm"
                } ${
                  sortedModelStreams.length === 0 && !workflowInProgress
                    ? "rounded-2xl"
                    : "rounded-t-2xl"
                }`}
                style={{
                  transition:
                    "background-color 400ms ease-out, box-shadow 400ms ease-out",
                }}
              >
                <div
                  className={`absolute inset-0 z-[1] overflow-hidden shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)] ${
                    sortedModelStreams.length === 0 && !workflowInProgress
                      ? "rounded-2xl"
                      : "rounded-t-2xl"
                  }`}
                />

                <div className="relative z-[2]">
                  {/* Input field - changes between textarea and input based on state */}
                  {sortedModelStreams.length === 0 && !workflowInProgress ? (
                    /* Initial state - textarea */
                    <textarea
                      ref={textareaRef}
                      value={userMessage}
                      onChange={(e) => {
                        setUserMessage(e.target.value);
                        autoResizeTextarea(e.target as HTMLTextAreaElement);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (
                            userMessage.trim() &&
                            selectedModelsForRun.length > 0
                          ) {
                            onSubmit();
                          }
                        }
                      }}
                      placeholder={
                        selectedModelsForRun.length === 0
                          ? "Select models below to start..."
                          : "What would you like to generate?"
                      }
                      className="w-full min-h-[76px] max-h-[300px] p-6 bg-transparent resize-none outline-none text-lg text-[#333333] placeholder-black/50 overflow-y-auto"
                      disabled={selectedModelsForRun.length === 0}
                      style={{
                        height: "76px",
                        transition: "height 0.1s ease",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    /* Generating state - input */
                    <input
                      value={userMessage}
                      onChange={(e) => {
                        setUserMessage(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          onSubmit();
                        }
                      }}
                      placeholder={
                        showSelectionPrompt
                          ? "Select a version above to continue"
                          : "Update the draft..."
                      }
                      className="w-full px-6 py-4 bg-transparent resize-none outline-none text-lg text-[#333333] placeholder-black/50"
                      disabled={
                        showSelectionPrompt ||
                        workflowInProgress ||
                        selectedModelsForRun.length === 0
                      }
                    />
                  )}

                  {/* Bottom section with model selector and send button */}
                  <div className="relative z-50 p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <ModelDropdown direction="up" />
                    </div>
                    <button
                      onClick={onSubmit}
                      disabled={
                        !userMessage.trim() ||
                        selectedModelsForRun.length === 0 ||
                        showSelectionPrompt ||
                        workflowInProgress
                      }
                      className="p-3 rounded-xl bg-white/20 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      <Send className="w-5 h-5 text-[#333333]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  );
}
