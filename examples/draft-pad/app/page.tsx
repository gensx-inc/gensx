"use client";

import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { ModelGridSelector } from "@/components/ui/model-grid-selector";
import { ModelStreamCard } from "@/components/ui/model-stream-card";
import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { fetchAvailableModels } from "@/lib/models";
import { useObject, useWorkflow } from "@gensx/react";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedModelsForRun, setSelectedModelsForRun] = useState<
    ModelConfig[]
  >([]);
  const [availableModels, setAvailableModels] = useState<ModelConfig[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

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

  // Check if we have completed streams and no selection
  const hasCompletedStreams = draftProgress?.modelStreams.some(
    (s) => s.status === "complete",
  );
  const showSelectionPrompt =
    hasCompletedStreams && !selectedModelId && !inProgress;

  // Show model selector if no streams exist
  const showModelSelector = !draftProgress?.modelStreams.length && !inProgress;

  // Sort model streams by completion status and time
  const sortedModelStreams = useMemo(() => {
    if (!draftProgress?.modelStreams) return [];

    return [...draftProgress.modelStreams].sort((a, b) => {
      // First, sort by completion status (completed first)
      if (a.status === "complete" && b.status !== "complete") return -1;
      if (a.status !== "complete" && b.status === "complete") return 1;

      // If both are complete, sort by generation time (fastest first)
      if (a.status === "complete" && b.status === "complete") {
        const timeA = a.generationTime ?? Infinity;
        const timeB = b.generationTime ?? Infinity;
        return timeA - timeB;
      }

      // If both are generating or have same status, maintain original order
      return 0;
    });
  }, [draftProgress?.modelStreams]);

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

  return (
    <div className="flex-1 flex flex-col h-screen p-6">
      <h1 className="text-3xl font-bold text-[#333333] font-atma text-center flex-shrink-0 mb-6">
        Draft Pad
      </h1>

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
              availableModels={availableModels}
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
            <div
              className={`${getGridClassName(sortedModelStreams.length)} ${getGridRowsClass(sortedModelStreams.length)} flex-1 min-h-0 auto-rows-fr transition-all duration-500`}
            >
              {sortedModelStreams.map((modelStream) => {
                // Calculate max word count across all models
                const maxWordCount = Math.max(
                  ...sortedModelStreams.map((s) => s.wordCount),
                  1,
                );

                // Calculate max generation time across all completed models
                const maxGenerationTime = Math.max(
                  ...sortedModelStreams
                    .filter((s) => s.generationTime !== undefined)
                    .map((s) => s.generationTime!),
                  1,
                );

                return (
                  <div
                    key={modelStream.modelId}
                    className="min-h-0 flex transition-all duration-500"
                  >
                    <ModelStreamCard
                      modelStream={modelStream}
                      isSelected={selectedModelId === modelStream.modelId}
                      onSelect={() => {
                        handleModelSelect(modelStream.modelId);
                      }}
                      scrollPosition={scrollPosition}
                      onScrollUpdate={setScrollPosition}
                      maxWordCount={maxWordCount}
                      maxGenerationTime={maxGenerationTime}
                    />
                  </div>
                );
              })}
            </div>
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
      <div className="flex-shrink-0 mt-6">
        {showSelectionPrompt ? (
          <div className="text-center">
            <div className="text-lg text-[#333333] mb-1">
              Choose Your Preferred Output
            </div>
            <div className="text-sm text-[#333333]/70">
              Click on one of the AI model outputs above to continue editing
            </div>
          </div>
        ) : (
          selectedModelId && (
            <DraftEditorCard
              isStreaming={inProgress}
              error={error}
              userMessage={userMessage}
              onUserMessageChange={setUserMessage}
              onSubmit={onSubmit}
              className="w-full"
            />
          )
        )}

        {/* Show input for initial prompt when no streams exist */}
        {showModelSelector &&
          selectedModelsForRun.length > 0 &&
          !isLoadingModels && (
            <DraftEditorCard
              isStreaming={inProgress}
              error={error}
              userMessage={userMessage}
              onUserMessageChange={setUserMessage}
              onSubmit={onSubmit}
              className="w-full"
            />
          )}
      </div>
    </div>
  );
}
