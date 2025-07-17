"use client";

import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { getApiUrl } from "@/lib/config";
import { fetchAvailableModels } from "@/lib/models";
import { type ContentVersion, type ModelResponse } from "@/lib/types";
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
  const [versionHistory, setVersionHistory] = useState<ContentVersion[]>([]);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(
    null,
  );

  // Version navigation state
  const [currentVersionIndex, setCurrentVersionIndex] = useState<number>(0);
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
    start,
  } = useWorkflow<UpdateDraftInput, UpdateDraftOutput>({
    config: {
      baseUrl: getApiUrl("/api/gensx"),
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

    // Store the user message for version history
    setPreviousUserMessage(userMessage.trim());

    // Generate a unique ID for this generation
    const generationId = `gen-${Date.now()}`;
    setCurrentGenerationId(generationId);

    // Reset hasCreatedVersion for new generation
    setHasCreatedVersion(false);

    // Store the base content used for this generation
    setBaseContentForCurrentGeneration(selectedContent || null);

    await start({
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
    start,
    userMessage,
    selectedContent,
    selectedModelsForRun,
    selectedModelId,
    versionHistory,
  ]);

  // Handle model selection
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);

    // Update the latest version's selectedModelId if it exists
    setVersionHistory((prev) => {
      if (prev.length === 0) return prev;

      const updatedVersions = [...prev];
      const latestVersion = updatedVersions[updatedVersions.length - 1];

      // Only update if this model is part of the latest version
      const modelExists = latestVersion.modelResponses.some(
        (r) => r.modelId === modelId,
      );
      if (modelExists) {
        updatedVersions[updatedVersions.length - 1] = {
          ...latestVersion,
          selectedModelId: modelId,
        };
      }

      return updatedVersions;
    });
  }, []);

  // Create model config map early so it can be used in other functions
  const modelConfigMap = useMemo(() => {
    const map = new Map<string, ModelConfig>();
    selectedModelsForRun.forEach((model) => {
      map.set(model.id, model);
    });
    return map;
  }, [selectedModelsForRun]);

  // Store previous user message for version history
  const [previousUserMessage, setPreviousUserMessage] = useState("");

  // Track if we've already created a version for the current generation
  const [hasCreatedVersion, setHasCreatedVersion] = useState(false);

  // Track the base content used for the current generation
  const [baseContentForCurrentGeneration, setBaseContentForCurrentGeneration] =
    useState<string | null>(null);

  // Save completed generation to version history
  useEffect(() => {
    if (
      !draftProgress?.modelStreams ||
      !currentGenerationId ||
      hasCreatedVersion
    )
      return;

    // Check if all models have completed
    const allCompleted = draftProgress.modelStreams.every(
      (stream) => stream.status === "complete" || stream.status === "error",
    );

    if (!allCompleted) return;

    // Build model responses
    const modelResponses: ModelResponse[] = draftProgress.modelStreams
      .filter((stream) => stream.status === "complete" && stream.content)
      .map((stream) => {
        const modelConfig = modelConfigMap.get(stream.modelId);

        // Calculate cost if we have the config and stream data
        let cost = undefined;
        if (modelConfig?.cost) {
          const inputTokens = stream.inputTokens ?? 500;
          const outputTokens =
            stream.outputTokens ?? Math.ceil(stream.charCount / 4);
          const inputCost = (inputTokens / 1_000_000) * modelConfig.cost.input;
          const outputCost =
            (outputTokens / 1_000_000) * modelConfig.cost.output;
          cost = {
            input: inputCost,
            output: outputCost,
            total: inputCost + outputCost,
          };
        }

        return {
          modelId: stream.modelId,
          content: stream.content,
          displayName: modelConfig?.displayName ?? stream.modelId, // Store the display name
          generationTime: stream.generationTime,
          inputTokens: stream.inputTokens,
          outputTokens: stream.outputTokens,
          wordCount: stream.wordCount,
          charCount: stream.charCount,
          cost,
        };
      });

    if (modelResponses.length === 0) return;

    // Create new version
    const newVersion: ContentVersion = {
      id: currentGenerationId,
      version: versionHistory.length + 1,
      timestamp: new Date(),
      modelResponses,
      selectedModelId: null, // No model selected yet from this generation
      userMessage: previousUserMessage,
    };

    setVersionHistory((prev) => [...prev, newVersion]);
    setHasCreatedVersion(true);
  }, [
    draftProgress?.modelStreams,
    currentGenerationId,
    hasCreatedVersion,
    modelConfigMap,
    previousUserMessage,
    versionHistory.length,
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

  // Use versionHistory directly since it's now an array
  const allVersions = versionHistory;

  // Get current version
  const currentVersion = useMemo(() => {
    if (allVersions.length === 0) return null;
    const index = Math.min(currentVersionIndex, allVersions.length - 1);
    return allVersions[index];
  }, [allVersions, currentVersionIndex]);

  // Current version content (selected model's content)
  const currentVersionContent = useMemo(() => {
    if (!currentVersion) return "";

    // If viewing history, get the selected model's content
    const selectedResponse = currentVersion.modelResponses.find(
      (response) => response.modelId === currentVersion.selectedModelId,
    );

    return selectedResponse?.content ?? "";
  }, [currentVersion]);

  // Navigate to previous version
  const navigateToPreviousVersion = useCallback(() => {
    setCurrentVersionIndex((prev) => Math.max(0, prev - 1));
    setIsViewingHistory(true);
    // Clear base content when viewing history
    setBaseContentForCurrentGeneration(null);
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
    // Clear base content when viewing history
    setBaseContentForCurrentGeneration(null);
  }, [allVersions.length]);

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
    currentVersion,
    currentVersionContent,
    navigateToPreviousVersion,
    navigateToNextVersion,
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
    baseContentForCurrentGeneration,

    // Actions
    handleSubmit,
    handleModelSelect,
    handleSort,
    handleModelSort,
    focusInput,
  };
}
