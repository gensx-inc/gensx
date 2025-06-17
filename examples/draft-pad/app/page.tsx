"use client";

import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { DraftStatsCard } from "@/components/ui/draft-stats-card";
import {
  type DraftProgress,
  type EndContentEvent,
  type StartContentEvent,
  type UpdateDraftInput,
  type UpdateDraftOutput,
} from "@/gensx/workflows";
import { useEvents, useObject, useWorkflow } from "@gensx/react";
import { useCallback, useMemo, useState } from "react";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");

  const { inProgress, error, output, execution, run } = useWorkflow<
    UpdateDraftInput,
    UpdateDraftOutput
  >({
    config: {
      baseUrl: "/api/gensx",
    },
  });

  const draftProgress = useObject<DraftProgress>(execution, "draft-progress");

  useEvents<StartContentEvent | EndContentEvent>(
    execution,
    "content-events",
    (event) => {
      console.log(`Content event: ${event.type} - ${event.content}`);
    },
  );

  // Memoize the current content to avoid recalculation
  const currentContent = useMemo(() => {
    return draftProgress?.content ?? output ?? "";
  }, [draftProgress?.content, output]);

  // Memoize the displayed content
  const displayContent = useMemo(() => {
    return currentContent || "No content yet";
  }, [currentContent]);

  const handleSubmit = useCallback(async () => {
    await run({
      inputs: {
        userMessage: userMessage.trim(),
        currentDraft: currentContent,
      },
    });
    setUserMessage("");
  }, [run, userMessage, currentContent]);

  const onSubmit = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col min-h-0">
        <h1 className="text-3xl font-bold text-[#333333] font-atma text-center mb-4 flex-shrink-0">
          Draft Pad
        </h1>
        <DraftEditorCard
          output={displayContent}
          isStreaming={inProgress}
          error={error}
          userMessage={userMessage}
          onUserMessageChange={setUserMessage}
          onSubmit={onSubmit}
          className="min-h-0"
        />
      </div>

      <DraftStatsCard draftProgress={draftProgress ?? null} />
    </div>
  );
}
