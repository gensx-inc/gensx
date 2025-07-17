"use client";

import { Header } from "@/components/Header";
import { InputSection } from "@/components/InputSection";
import { ModelSelectorView } from "@/components/ModelSelectorView";
import { ModelStreamView } from "@/components/ModelStreamView";
import { VersionControls } from "@/components/ui/version-controls";
import { useAvailableModels } from "@/hooks/useAvailableModels";
import { useDiffState } from "@/hooks/useDiffState";
import { useDraftPad } from "@/hooks/useDraftPad";
import { useModelStreams } from "@/hooks/useModelStreams";
import {
  useVoiceCommands,
  type VoiceActionsInterface,
} from "@/hooks/useVoiceCommands";
import { getApiBasePath } from "@/lib/config";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export default function Home() {
  const draftPad = useDraftPad();
  const diffState = useDiffState();
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [logoSrc, setLogoSrc] = useState("/gensx-logo.svg"); // Default fallback

  const { sortedModelStreams, metricRanges, overallStats } = useModelStreams(
    draftPad.draftProgress,
    draftPad.sortConfig,
    draftPad.modelConfigMap,
  );

  const { sortedAvailableModels, modelMetricRanges } = useAvailableModels(
    draftPad.availableModels,
    draftPad.modelSortConfig,
    draftPad.selectedProvider,
  );

  // Set the correct logo path on client side
  useEffect(() => {
    const basePath = getApiBasePath();
    setLogoSrc(`${basePath}/gensx-logo.svg`);
  }, []);

  // Show auto diff when all models complete
  const prevGeneratingRef = useRef(false);

  useEffect(() => {
    if (draftPad.draftProgress?.modelStreams) {
      const hasGenerating = draftPad.draftProgress.modelStreams.some(
        (stream) => stream.status === "generating",
      );
      const hasCompleted = draftPad.draftProgress.modelStreams.some(
        (stream) => stream.status === "complete",
      );

      // Show auto diff when transitioning from generating to all completed
      if (prevGeneratingRef.current && !hasGenerating && hasCompleted) {
        diffState.showAutoCompletion();
      }

      prevGeneratingRef.current = hasGenerating;
    }
  }, [draftPad.draftProgress?.modelStreams, diffState.showAutoCompletion]);

  const onSubmit = useCallback(() => {
    // Always hide model selector view when submitting
    draftPad.setShowModelSelectorView(false);
    // Clear selected model to show all models during generation
    draftPad.setSelectedModelId(null);
    // Reset diff state for new generation
    diffState.resetDiff();
    void draftPad.handleSubmit();
  }, [
    draftPad.setShowModelSelectorView,
    draftPad.setSelectedModelId,
    diffState.resetDiff,
    draftPad.handleSubmit,
  ]);

  // Voice command actions interface
  const voiceActions: VoiceActionsInterface = useMemo(() => {
    // Helper function for precise model matching
    const findMatchingModels = (
      modelNames: string[],
      matchType: "exact" | "partial" | "provider" = "partial",
    ) => {
      return draftPad.availableModels.filter((model) => {
        // Only include available models
        if (!model.available) return false;

        return modelNames.some((name) => {
          const nameLower = name.toLowerCase();

          switch (matchType) {
            case "exact":
              // Exact match on model ID, model name, or display name
              return (
                model.id.toLowerCase() === nameLower ||
                model.model.toLowerCase() === nameLower ||
                (model.displayName?.toLowerCase() ?? "") === nameLower
              );

            case "provider":
              // Match by provider name
              return (
                model.provider.toLowerCase() === nameLower ||
                (model.providerName?.toLowerCase() ?? "") === nameLower ||
                // Common provider aliases
                (nameLower === "openai" &&
                  model.provider.toLowerCase() === "openai") ||
                (nameLower === "anthropic" &&
                  model.provider.toLowerCase() === "anthropic") ||
                (nameLower === "google" &&
                  model.provider.toLowerCase() === "google") ||
                (nameLower === "gemini" &&
                  model.provider.toLowerCase() === "google") ||
                (nameLower === "meta" &&
                  model.provider.toLowerCase() === "meta") ||
                (nameLower === "llama" &&
                  model.provider.toLowerCase() === "meta")
              );

            case "partial":
            default:
              // Intelligent partial matching - prioritize model names over IDs
              const modelMatch = model.model.toLowerCase().includes(nameLower);
              const displayNameMatch = (
                model.displayName?.toLowerCase() ?? ""
              ).includes(nameLower);
              const idMatch = model.id.toLowerCase().includes(nameLower);
              const providerMatch = model.provider.toLowerCase() === nameLower;

              // Return true if we have a good match (prioritize specific model names)
              return modelMatch || displayNameMatch || providerMatch || idMatch;
          }
        });
      });
    };

    return {
      // Model selection actions
      addModels: (
        modelNames: string[],
        matchType: "exact" | "partial" | "provider" = "partial",
      ) => {
        const currentSelected = draftPad.selectedModelsForRun;
        const modelsToAdd = findMatchingModels(modelNames, matchType);

        // Filter out already selected models
        const newModels = modelsToAdd.filter(
          (model) =>
            !currentSelected.some((selected) => selected.id === model.id),
        );

        if (newModels.length > 0) {
          const updatedModels = [...currentSelected, ...newModels].slice(0, 9); // Max 9 models
          draftPad.setSelectedModelsForRun(updatedModels);

          // Enable multi-select if adding multiple models
          if (updatedModels.length > 1) {
            draftPad.setIsMultiSelectMode(true);
          }
        }
      },

      removeModels: (
        modelNames: string[],
        matchType: "exact" | "partial" | "provider" = "partial",
      ) => {
        const currentSelected = draftPad.selectedModelsForRun;
        const modelsToRemove = findMatchingModels(modelNames, matchType);

        const modelsToKeep = currentSelected.filter(
          (model) =>
            !modelsToRemove.some((removeModel) => removeModel.id === model.id),
        );

        draftPad.setSelectedModelsForRun(modelsToKeep);
      },

      selectOnlyModels: (
        modelNames: string[],
        matchType: "exact" | "partial" | "provider" = "partial",
      ) => {
        const modelsToSelect = findMatchingModels(modelNames, matchType);

        if (modelsToSelect.length > 0) {
          draftPad.setSelectedModelsForRun(modelsToSelect.slice(0, 9)); // Max 9 models

          // Set multi-select mode based on selection count
          draftPad.setIsMultiSelectMode(modelsToSelect.length > 1);
        }
      },

      setToSingleModel: (
        modelName: string,
        matchType: "exact" | "partial" | "provider" = "exact",
      ) => {
        const matchingModels = findMatchingModels([modelName], matchType);

        if (matchingModels.length > 0) {
          // Select only the first matching model
          draftPad.setSelectedModelsForRun([matchingModels[0]]);
          // Always set to single-select mode
          draftPad.setIsMultiSelectMode(false);
        }
      },

      clearAllModels: () => {
        draftPad.setSelectedModelsForRun([]);
      },

      toggleMultiSelect: () => {
        const newMode = !draftPad.isMultiSelectMode;
        draftPad.setIsMultiSelectMode(newMode);

        // When switching to single-select mode, keep only the first model
        if (!newMode && draftPad.selectedModelsForRun.length > 1) {
          draftPad.setSelectedModelsForRun([draftPad.selectedModelsForRun[0]]);
        }
      },

      // Sorting actions
      sortGenerations: (field: "words" | "time" | "cost") => {
        draftPad.handleSort(field);
      },

      sortModels: (field: "cost" | "context" | "maxOutput") => {
        draftPad.handleModelSort(field);
      },

      // Diff control actions
      showDiff: () => {
        // Force show diff by setting manual mode
        if (!diffState.showDiff) {
          diffState.toggleDiff();
        }
      },

      hideDiff: () => {
        // Force hide diff
        if (diffState.showDiff) {
          diffState.toggleDiff();
        }
      },

      toggleDiff: () => {
        diffState.toggleDiff();
      },

      // Version navigation actions
      goToPreviousVersion: () => {
        if (draftPad.currentVersionIndex > 0) {
          draftPad.navigateToPreviousVersion();
        }
      },

      goToNextVersion: () => {
        if (draftPad.currentVersionIndex < draftPad.allVersions.length - 1) {
          draftPad.navigateToNextVersion();
        }
      },

      goToVersion: (version: number) => {
        const targetIndex = version - 1; // Convert 1-based to 0-based
        if (targetIndex >= 0 && targetIndex < draftPad.allVersions.length) {
          // Navigate to specific version by calling previous/next multiple times
          const currentIndex = draftPad.currentVersionIndex;
          const diff = targetIndex - currentIndex;

          if (diff > 0) {
            // Go forward
            for (let i = 0; i < diff; i++) {
              draftPad.navigateToNextVersion();
            }
          } else if (diff < 0) {
            // Go backward
            for (let i = 0; i < Math.abs(diff); i++) {
              draftPad.navigateToPreviousVersion();
            }
          }
        }
      },

      goToLatestVersion: () => {
        // Navigate to the latest version
        while (draftPad.currentVersionIndex < draftPad.allVersions.length - 1) {
          draftPad.navigateToNextVersion();
        }
      },

      // UI control actions
      openModelSelector: () => {
        draftPad.setShowModelSelectorView(true);
      },

      closeModelSelector: () => {
        draftPad.setShowModelSelectorView(false);
      },

      // Text input actions
      submitText: (text: string) => {
        draftPad.setUserMessage(text);
        // Submit after a brief delay to ensure state is updated
        setTimeout(() => {
          onSubmit();
        }, 50);
      },
    };
  }, [draftPad, diffState, onSubmit]);

  // Voice commands hook
  const voiceCommands = useVoiceCommands({
    availableModels: draftPad.availableModels,
    selectedModelsForRun: draftPad.selectedModelsForRun,
    actions: voiceActions,
    isVoiceActive,
  });

  const showCounter =
    draftPad.showModelSelectorView && !draftPad.isLoadingModels;

  return (
    <div
      className="flex-1 flex flex-col h-screen pt-6 px-6"
      style={{ scrollBehavior: "auto" }}
    >
      {/* Logo Section - Top Left */}
      <div className="fixed top-4 left-4 z-50 flex items-center gap-3">
        {/* GenSX Logo */}
        <a
          href="https://gensx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="bg-white/60 backdrop-blur-3xl rounded-2xl p-1 shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 cursor-pointer">
            <img src={logoSrc} alt="GenSX Logo" className="h-12" />
          </div>
        </a>

        {/* Groq Logo */}
        <a
          href="https://groq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="bg-white/60 backdrop-blur-3xl rounded-2xl p-2 shadow-lg border border-white/30 hover:bg-white/80 transition-all duration-300 cursor-pointer">
            <img
              src="https://console.groq.com/powered-by-groq.svg"
              alt="Powered by Groq for fast inference."
              className="h-10"
            />
          </div>
        </a>
      </div>

      {/* Voice command feedback is now shown in the voice button itself */}

      {/* Header */}
      <Header
        selectedModelId={draftPad.selectedModelId}
        showModelSelector={draftPad.showModelSelectorView}
        sortedModelStreams={sortedModelStreams}
        overallStats={overallStats}
        showCounter={showCounter}
        selectedModelsForRun={draftPad.selectedModelsForRun}
        uniqueProviders={draftPad.uniqueProviders}
        selectedProvider={draftPad.selectedProvider}
        onProviderChange={draftPad.setSelectedProvider}
        modelMetricRanges={modelMetricRanges}
        modelSortConfig={draftPad.modelSortConfig}
        sortConfig={draftPad.sortConfig}
        onModelSort={draftPad.handleModelSort}
        onSort={draftPad.handleSort}
      />

      {/* Full screen model selector view */}
      {draftPad.showModelSelectorView && (
        <ModelSelectorView
          isLoadingModels={draftPad.isLoadingModels}
          sortedAvailableModels={sortedAvailableModels}
          selectedModelsForRun={draftPad.selectedModelsForRun}
          onModelsChange={draftPad.setSelectedModelsForRun}
          onClose={() => {
            draftPad.setShowModelSelectorView(false);
          }}
        />
      )}

      {/* Main content area */}
      {!draftPad.showModelSelectorView && (
        <>
          {/* If no model streams, show initial centered view */}
          {sortedModelStreams.length === 0 && !draftPad.workflowInProgress ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              {/* Empty space for centering - input will be positioned at bottom */}
            </div>
          ) : /* Check if we're viewing history or live streams */
          draftPad.isViewingHistory && draftPad.currentVersion ? (
            /* Show historical version with all models */
            (() => {
              console.log("Viewing history - currentVersion:", {
                version: draftPad.currentVersion.version,
                modelResponsesCount:
                  draftPad.currentVersion.modelResponses.length,
                selectedModelId: draftPad.currentVersion.selectedModelId,
                modelIds: draftPad.currentVersion.modelResponses.map(
                  (r) => r.modelId,
                ),
              });

              return (
                <ModelStreamView
                  selectedModelId={draftPad.currentVersion.selectedModelId}
                  sortedModelStreams={draftPad.currentVersion.modelResponses.map(
                    (response) => ({
                      modelId: response.modelId,
                      displayName: response.displayName ?? response.modelId,
                      status: "complete" as const,
                      content: response.content,
                      wordCount: response.wordCount,
                      charCount: response.charCount,
                      generationTime: response.generationTime,
                      inputTokens: response.inputTokens,
                      outputTokens: response.outputTokens,
                    }),
                  )}
                  modelConfigMap={draftPad.modelConfigMap}
                  versionHistory={draftPad.versionHistory}
                  chosenResponseForCurrentGeneration={(() => {
                    // When viewing history, we need the previous version's selected model content
                    // to show diffs properly
                    const currentVersion = draftPad.currentVersion;
                    const currentIndex = draftPad.allVersions.findIndex(
                      (v) => v.id === currentVersion.id,
                    );
                    if (currentIndex <= 0) return null; // No previous version

                    const previousVersion =
                      draftPad.allVersions[currentIndex - 1];
                    if (!previousVersion.selectedModelId) return null;

                    const previousSelectedResponse =
                      previousVersion.modelResponses.find(
                        (r) => r.modelId === previousVersion.selectedModelId,
                      );
                    return previousSelectedResponse?.content ?? null;
                  })()}
                  isDiffVisible={diffState.isDiffVisible}
                  showDiff={diffState.showDiff}
                  autoShowDiff={true} // Show diffs automatically when viewing history
                  isManuallyHiding={diffState.isManuallyHiding}
                  showAllModels={true} // Force showing all models when viewing history
                  metricRanges={metricRanges}
                  onModelSelect={(_modelId) => {
                    // When viewing history, selection is read-only
                    // The selectedModelId shows which model was chosen for next generation
                  }}
                  onShowAllModels={() => {
                    // No-op for historical view since it's read-only
                  }}
                />
              );
            })()
          ) : (
            /* Show live model streams */
            <ModelStreamView
              selectedModelId={draftPad.selectedModelId}
              sortedModelStreams={sortedModelStreams}
              modelConfigMap={draftPad.modelConfigMap}
              versionHistory={draftPad.versionHistory}
              chosenResponseForCurrentGeneration={
                draftPad.baseContentForCurrentGeneration
              }
              isDiffVisible={diffState.isDiffVisible}
              showDiff={diffState.showDiff}
              autoShowDiff={diffState.autoShowDiff}
              isManuallyHiding={diffState.isManuallyHiding}
              metricRanges={metricRanges}
              onModelSelect={draftPad.handleModelSelect}
              onShowAllModels={() => {
                draftPad.setSelectedModelId(null);
              }}
            />
          )}

          {/* Version controls - show when we have versions */}
          {draftPad.allVersions.length > 0 && (
            <div className="mt-2 flex justify-center items-center">
              <VersionControls
                currentVersion={draftPad.currentVersionIndex + 1}
                totalVersions={draftPad.allVersions.length}
                onPreviousVersion={draftPad.navigateToPreviousVersion}
                onNextVersion={draftPad.navigateToNextVersion}
                showDiff={diffState.showDiff}
                onToggleDiff={diffState.toggleDiff}
                canGoPrevious={draftPad.currentVersionIndex > 0}
                canGoNext={
                  draftPad.currentVersionIndex < draftPad.allVersions.length - 1
                }
              />
            </div>
          )}

          {/* Unified input section - transitions from center to bottom */}
          <InputSection
            userMessage={draftPad.userMessage}
            selectedModelsForRun={draftPad.selectedModelsForRun}
            sortedAvailableModels={sortedAvailableModels}
            isMultiSelectMode={draftPad.isMultiSelectMode}
            showSelectionPrompt={draftPad.showSelectionPrompt ?? false}
            workflowInProgress={draftPad.workflowInProgress}
            sortedModelStreamsLength={sortedModelStreams.length}
            isDropdownOpen={draftPad.isDropdownOpen}
            textareaRef={draftPad.textareaRef as RefObject<HTMLTextAreaElement>}
            _inputRef={draftPad.inputRef as RefObject<HTMLInputElement>}
            isVoiceActive={isVoiceActive}
            onUserMessageChange={draftPad.setUserMessage}
            onMultiSelectModeChange={draftPad.setIsMultiSelectMode}
            onModelsChange={draftPad.setSelectedModelsForRun}
            onDropdownOpenChange={draftPad.setIsDropdownOpen}
            onSubmit={onSubmit}
            onVoiceActiveChange={setIsVoiceActive}
            voiceCommands={voiceCommands}
          />
        </>
      )}
    </div>
  );
}
