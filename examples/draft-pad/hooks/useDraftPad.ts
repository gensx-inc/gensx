"use client";

import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { fetchAvailableModels } from "@/lib/models";
import { type ContentVersion } from "@/lib/types";
import { useObject, useWorkflow } from "@gensx/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  }, [run, userMessage, selectedContent, selectedModelsForRun]);

  // Handle model selection
  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
  }, []);

  // Add version to history
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
          addVersionToHistory(stream.modelId, stream.content);
        }
      }
    });
  }, [draftProgress?.modelStreams, versionHistory, addVersionToHistory]);

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

  const modelConfigMap = useMemo(() => {
    const map = new Map<string, ModelConfig>();
    selectedModelsForRun.forEach((model) => {
      map.set(model.id, model);
    });
    return map;
  }, [selectedModelsForRun]);

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
