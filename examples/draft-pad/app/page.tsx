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
import { getApiBasePath } from "@/lib/config";
import {
  type RefObject,
  useCallback,
  useEffect,
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

  const showCounter =
    draftPad.showModelSelectorView && !draftPad.isLoadingModels;

  return (
    <div
      className="flex-1 flex flex-col h-screen pt-6 px-6"
      style={{ scrollBehavior: "auto" }}
    >
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
        onBackToAllModels={() => {
          draftPad.setSelectedModelId(null);
        }}
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
          focusInput={draftPad.focusInput}
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
            />
          )}

          {/* Version controls - show when we have versions */}
          {draftPad.allVersions.length > 0 && (
            <div className="mt-2 flex justify-center">
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
          />
        </>
      )}

      {/* GenSX Logo Badge - Bottom Right */}
      <div className="fixed bottom-2 right-2 z-50">
        <a
          href="https://gensx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="bg-gray-700/20 backdrop-blur-3xl rounded-3xl p-0.5 shadow-lg border border-white/30 hover:bg-white/60 transition-all duration-300 cursor-pointer">
            <img src={logoSrc} alt="GenSX Logo" className="w-48 h-16" />
          </div>
        </a>
      </div>
    </div>
  );
}
