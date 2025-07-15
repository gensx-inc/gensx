"use client";

import { Header } from "@/components/Header";
import { InputSection } from "@/components/InputSection";
import { ModelSelectorView } from "@/components/ModelSelectorView";
import { ModelStreamView } from "@/components/ModelStreamView";
import { ModelStreamCard } from "@/components/ui/model-stream-card";
import { VersionControls } from "@/components/ui/version-controls";
import { useAvailableModels } from "@/hooks/useAvailableModels";
import { useDiffState } from "@/hooks/useDiffState";
import { useDraftPad } from "@/hooks/useDraftPad";
import { useModelStreams } from "@/hooks/useModelStreams";
import { type RefObject, useCallback, useEffect, useRef } from "react";

export default function Home() {
  const draftPad = useDraftPad();
  const diffState = useDiffState();

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
        showDiff={diffState.showDiff}
        onToggleDiff={diffState.toggleDiff}
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
          draftPad.isViewingHistory && draftPad.allVersions.length > 0 ? (
            /* Show historical version */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 flex justify-center min-h-0">
                <div className="w-full max-w-3xl min-h-0 flex">
                  <ModelStreamCard
                    modelStream={{
                      modelId:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .modelId,
                      displayName:
                        draftPad.modelConfigMap.get(
                          draftPad.allVersions[draftPad.currentVersionIndex]
                            .modelId,
                        )?.displayName ??
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .modelId,
                      status: "complete" as const,
                      content: draftPad.currentVersionContent,
                      wordCount:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .wordCount,
                      charCount:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .charCount,
                      generationTime:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .generationTime,
                      inputTokens:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .inputTokens,
                      outputTokens:
                        draftPad.allVersions[draftPad.currentVersionIndex]
                          .outputTokens,
                    }}
                    modelConfig={draftPad.modelConfigMap.get(
                      draftPad.allVersions[draftPad.currentVersionIndex]
                        .modelId,
                    )}
                    isSelected={true}
                    onSelect={undefined}
                    metricRanges={null}
                    showDiff={diffState.showDiff}
                    autoShowDiff={false}
                    previousVersion={
                      draftPad.currentVersionIndex > 0
                        ? draftPad.allVersions[draftPad.currentVersionIndex - 1]
                        : undefined
                    }
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Show live model streams */
            <ModelStreamView
              selectedModelId={draftPad.selectedModelId}
              sortedModelStreams={sortedModelStreams}
              modelConfigMap={draftPad.modelConfigMap}
              versionHistory={draftPad.versionHistory}
              chosenResponseForCurrentGeneration={
                draftPad.chosenResponseForCurrentGeneration
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
                onCopy={() => void draftPad.copyCurrentVersion()}
                canGoPrevious={draftPad.currentVersionIndex > 0}
                canGoNext={
                  draftPad.currentVersionIndex < draftPad.allVersions.length - 1
                }
                showCopyFeedback={draftPad.showCopyFeedback}
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
            inputRef={draftPad.inputRef as RefObject<HTMLInputElement>}
            onUserMessageChange={draftPad.setUserMessage}
            onMultiSelectModeChange={draftPad.setIsMultiSelectMode}
            onModelsChange={draftPad.setSelectedModelsForRun}
            onDropdownOpenChange={draftPad.setIsDropdownOpen}
            onSubmit={onSubmit}
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
            <img src="/gensx-logo.svg" alt="GenSX Logo" className="w-48 h-16" />
          </div>
        </a>
      </div>
    </div>
  );
}
