"use client";

import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { ModelSelector } from "@/components/ui/model-selector";
import { ModelStreamCard } from "@/components/ui/model-stream-card";
import {
  type DraftProgress,
  type ModelConfig,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { useObject, useWorkflow } from "@gensx/react";
import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [selectedModelsForRun, setSelectedModelsForRun] = useState<
    ModelConfig[]
  >([]);

  // Define available models
  const availableModels: ModelConfig[] = useMemo(
    () => [
      {
        id: "gpt-4o-mini",
        provider: "openai",
        model: "gpt-4o-mini",
        displayName: "GPT-4o Mini",
      },
      {
        id: "gpt-3.5-turbo",
        provider: "openai",
        model: "gpt-3.5-turbo",
        displayName: "GPT-3.5 Turbo",
      },
      {
        id: "gpt-4o",
        provider: "openai",
        model: "gpt-4o",
        displayName: "GPT-4o",
      },
      {
        id: "gpt-4-turbo",
        provider: "openai",
        model: "gpt-4-turbo",
        displayName: "GPT-4 Turbo",
      },
      {
        id: "text-davinci-003",
        provider: "openai",
        model: "text-davinci-003",
        displayName: "Davinci 003",
      },
    ],
    [],
  );

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

    // Don't reset selection immediately to prevent layout shift
    await run({
      inputs: {
        userMessage: userMessage.trim(),
        currentDraft: selectedContent,
        models: selectedModelsForRun,
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

  return (
    <div className="flex-1 flex flex-col gap-6 h-full p-6">
      <h1 className="text-3xl font-bold text-[#333333] font-atma text-center flex-shrink-0">
        Draft Pad
      </h1>

      {/* Model selector */}
      {showModelSelector && (
        <div className="flex-shrink-0">
          <ModelSelector
            availableModels={availableModels}
            selectedModels={selectedModelsForRun}
            onModelsChange={setSelectedModelsForRun}
            maxModels={3}
          />
        </div>
      )}

      {/* Model streams section - always reserve space */}
      <div className="flex-1 min-h-0 flex flex-col">
        {draftProgress?.modelStreams &&
        draftProgress.modelStreams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
            {draftProgress.modelStreams.map((modelStream) => (
              <ModelStreamCard
                key={modelStream.modelId}
                modelStream={modelStream}
                isSelected={selectedModelId === modelStream.modelId}
                onSelect={() => {
                  handleModelSelect(modelStream.modelId);
                }}
                scrollPosition={scrollPosition}
                onScrollUpdate={setScrollPosition}
              />
            ))}
          </div>
        ) : (
          !showModelSelector && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 min-h-0">
              <div className="flex items-center justify-center text-[#333333]/60 border-2 border-dashed border-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="text-lg mb-2">Ready to generate content</div>
                  <div className="text-sm">Select models above to start</div>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center text-[#333333]/40 border-2 border-dashed border-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="text-sm">Model 2 will appear here</div>
                </div>
              </div>
              <div className="hidden lg:flex items-center justify-center text-[#333333]/40 border-2 border-dashed border-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="text-sm">Model 3 will appear here</div>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Conditional input section */}
      <div className="flex-shrink-0">
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
        {showModelSelector && selectedModelsForRun.length > 0 && (
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
