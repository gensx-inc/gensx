"use client";

import {
  type DraftProgress,
  type ModelConfig,
  type ModelStreamState,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { fetchAvailableModels } from "@/lib/models";
import { type ContentVersion } from "@/lib/types";
import { useObject, useWorkflow } from "@gensx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SortField = "words" | "time" | "cost";
type SortDirection = "asc" | "desc" | "none";
type ModelSortField = "cost" | "context" | "maxOutput";

interface SortConfig {
  field: SortField | null;
  direction: SortDirection;
}

interface ModelSortConfig {
  field: ModelSortField | null;
  direction: SortDirection;
}

export function useDraftPad() {
  // Core state
  const [userMessage, setUserMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedModelsForRun, setSelectedModelsForRun] = useState<
    ModelConfig[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [showModelSelectorView, setShowModelSelectorView] = useState(false);
  const [versionHistory, setVersionHistory] = useState<
    Record<string, ContentVersion[]>
  >({});
  const [
    chosenResponseForCurrentGeneration,
    setChosenResponseForCurrentGeneration,
  ] = useState<string | null>(null);

  // Version navigation state
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isViewingHistory, setIsViewingHistory] = useState(false);

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: null,
    direction: "none",
  });
  const [modelSortConfig, setModelSortConfig] = useState<ModelSortConfig>({
    field: null,
    direction: "none",
  });

  // UI state
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Constants
  const defaultModelId = "groq-meta-llama/llama-4-maverick-17b-128e-instruct";

  // Workflow
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

  // Load models on mount
  useEffect(() => {
    async function loadModels() {
      setIsLoadingModels(true);
      try {
        const models = await fetchAvailableModels();
        setAvailableModels(models);

        // Set default model if none selected
        if (selectedModelsForRun.length === 0) {
          const defaultModel = models.find(
            (m) => m.id === defaultModelId && m.available,
          );
          if (defaultModel) {
            setSelectedModelsForRun([defaultModel]);
          } else {
            const firstAvailable = models.find((m) => m.available);
            if (firstAvailable) {
              setSelectedModelsForRun([firstAvailable]);
            } else {
              // Fallback model
              const fallbackModel = {
                id: "gpt-4o-mini-fallback",
                provider: "openai" as const,
                model: "gpt-4o-mini",
                displayName: "GPT-4o Mini (Fallback)",
                available: true,
              };
              setSelectedModelsForRun([fallbackModel]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load models:", error);
        const fallbackModel = {
          id: "gpt-4o-mini-emergency",
          provider: "openai" as const,
          model: "gpt-4o-mini",
          displayName: "GPT-4o Mini (Emergency Fallback)",
          available: true,
        };
        setSelectedModelsForRun([fallbackModel]);
      } finally {
        setIsLoadingModels(false);
      }
    }

    void loadModels();
  }, []);

  // Get selected content for iterations
  const selectedContent = useMemo(() => {
    if (!selectedModelId || !draftProgress?.modelStreams.length) {
      return "";
    }
    const selectedStream = draftProgress.modelStreams.find(
      (s) => s.modelId === selectedModelId,
    );
    return selectedStream ? selectedStream.content : "";
  }, [selectedModelId, draftProgress?.modelStreams]);

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (selectedModelsForRun.length === 0) return;

    const modelsForWorkflow = selectedModelsForRun.map(
      ({ available, reasoning, ...model }) => model,
    );

    // Store the chosen response for diff calculations
    setChosenResponseForCurrentGeneration(selectedContent);

    await run({
      inputs: {
        userMessage: userMessage.trim(),
        currentDraft: selectedContent,
        models: modelsForWorkflow,
      },
    });

    setUserMessage("");
    setTimeout(() => {
      setSelectedModelId(null);
    }, 100);
  }, [
    run,
    userMessage,
    selectedContent,
    selectedModelsForRun,
    setChosenResponseForCurrentGeneration,
  ]);

  // Handle model selection
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  // Create model config map early so it can be used in other functions
  const modelConfigMap = useMemo(() => {
    const map = new Map<string, ModelConfig>();
    selectedModelsForRun.forEach((model) => {
      map.set(model.id, model);
    });
    return map;
  }, [selectedModelsForRun]);

  // Add version to history
  const addVersionToHistory = useCallback(
    (
      modelId: string,
      content: string,
      modelStream?: ModelStreamState,
      modelConfig?: ModelConfig,
    ) => {
      setVersionHistory((prev) => {
        const modelVersions = prev[modelId] ?? [];

        // Calculate cost if we have the config and stream data
        let cost = undefined;
        if (modelConfig?.cost && modelStream) {
          const inputTokens = modelStream.inputTokens ?? 500;
          const outputTokens =
            modelStream.outputTokens ?? Math.ceil(modelStream.charCount / 4);
          const inputCost = (inputTokens / 1_000_000) * modelConfig.cost.input;
          const outputCost =
            (outputTokens / 1_000_000) * modelConfig.cost.output;
          cost = {
            input: inputCost,
            output: outputCost,
            total: inputCost + outputCost,
          };
        }

        const newVersion: ContentVersion = {
          id: `${modelId}-v${modelVersions.length + 1}`,
          version: modelVersions.length + 1,
          content,
          modelId,
          timestamp: new Date(),
          generationTime: modelStream?.generationTime,
          inputTokens: modelStream?.inputTokens,
          outputTokens: modelStream?.outputTokens,
          wordCount:
            modelStream?.wordCount ??
            content.split(/\s+/).filter((w) => w.length > 0).length,
          charCount: modelStream?.charCount ?? content.length,
          cost,
        };
        return {
          ...prev,
          [modelId]: [...modelVersions, newVersion],
        };
      });
    },
    [],
  );

  // Save completed streams to version history
  useEffect(() => {
    if (!draftProgress?.modelStreams) return;

    draftProgress.modelStreams.forEach((stream) => {
      if (stream.status === "complete" && stream.content) {
        const modelHistory = versionHistory[stream.modelId] ?? [];
        const lastVersion = modelHistory[modelHistory.length - 1];

        if (
          modelHistory.length === 0 ||
          lastVersion.content !== stream.content
        ) {
          const modelConfig = modelConfigMap.get(stream.modelId);
          addVersionToHistory(
            stream.modelId,
            stream.content,
            stream,
            modelConfig,
          );
        }
      }
    });
  }, [
    draftProgress?.modelStreams,
    versionHistory,
    addVersionToHistory,
    modelConfigMap,
  ]);

  // Handle sorting
  const handleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === "asc") {
          return { field, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { field: null, direction: "none" };
        }
      }
      return { field, direction: "asc" };
    });
  }, []);

  const handleModelSort = useCallback((field: ModelSortField) => {
    setModelSortConfig((prev) => {
      if (prev.field === field) {
        if (prev.direction === "asc") {
          return { field, direction: "desc" };
        } else if (prev.direction === "desc") {
          return { field: null, direction: "none" };
        }
      }
      return { field, direction: "asc" };
    });
  }, []);

  // Auto-select single completed model
  const completedStreams =
    draftProgress?.modelStreams.filter((s) => s.status === "complete") ?? [];

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

  // Computed values
  const hasCompletedStreams = draftProgress?.modelStreams.some(
    (s) => s.status === "complete",
  );

  const showSelectionPrompt =
    hasCompletedStreams &&
    !selectedModelId &&
    !workflowInProgress &&
    completedStreams.length > 1;

  // Get unique providers
  const uniqueProviders = useMemo(() => {
    const providers = new Set(
      availableModels.filter((m) => m.providerName).map((m) => m.providerName!),
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

  // Get all versions across all models for global navigation
  const allVersions = useMemo(() => {
    const versions: ContentVersion[] = [];
    Object.values(versionHistory).forEach((modelVersions) => {
      versions.push(...modelVersions);
    });
    // Sort by timestamp, oldest first
    return versions.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }, [versionHistory]);

  // Current version content
  const currentVersionContent = useMemo(() => {
    if (allVersions.length === 0) return "";
    const index = Math.min(currentVersionIndex, allVersions.length - 1);
    return allVersions[index]?.content || "";
  }, [allVersions, currentVersionIndex]);

  // Navigate to previous version
  const navigateToPreviousVersion = useCallback(() => {
    setCurrentVersionIndex((prev) => Math.max(0, prev - 1));
    setIsViewingHistory(true);
  }, []);

  // Navigate to next version
  const navigateToNextVersion = useCallback(() => {
    setCurrentVersionIndex((prev) => {
      const newIndex = Math.min(allVersions.length - 1, prev + 1);
      // If we're at the latest version, exit history mode
      if (newIndex === allVersions.length - 1) {
        setIsViewingHistory(false);
      }
      return newIndex;
    });
  }, [allVersions.length]);

  // Copy current version to clipboard
  const copyCurrentVersion = useCallback(async () => {
    if (currentVersionContent) {
      await navigator.clipboard.writeText(currentVersionContent);
      setShowCopyFeedback(true);
      setTimeout(() => {
        setShowCopyFeedback(false);
      }, 2000);
    }
  }, [currentVersionContent]);

  // Update current version index when new versions are added
  useEffect(() => {
    // Always navigate to the latest version when a new one is added
    if (allVersions.length > 0) {
      setCurrentVersionIndex(allVersions.length - 1);
      setIsViewingHistory(false); // Exit history mode when new content arrives
    }
  }, [allVersions.length]);

  return {
    // State
    userMessage,
    setUserMessage,
    selectedModelId,
    setSelectedModelId,
    selectedModelsForRun,
    setSelectedModelsForRun,
    availableModels,
    isLoadingModels,
    showModelSelectorView,
    setShowModelSelectorView,
    versionHistory,
    chosenResponseForCurrentGeneration,
    sortConfig,
    modelSortConfig,
    selectedProvider,
    setSelectedProvider,
    isDropdownOpen,
    setIsDropdownOpen,
    isMultiSelectMode,
    setIsMultiSelectMode,

    // Version navigation
    currentVersionIndex,
    allVersions,
    currentVersionContent,
    navigateToPreviousVersion,
    navigateToNextVersion,
    copyCurrentVersion,
    showCopyFeedback,
    isViewingHistory,

    // Refs
    textareaRef,
    inputRef,

    // Workflow
    workflowInProgress,
    draftProgress,

    // Computed
    selectedContent,
    hasCompletedStreams,
    showSelectionPrompt,
    modelConfigMap,
    uniqueProviders,

    // Actions
    handleSubmit,
    handleModelSelect,
    handleSort,
    handleModelSort,
    focusInput,
  };
}
