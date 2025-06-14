"use client";

import { useState } from 'react';
import { useWorkflow, useObject, useEvents } from '@gensx/react';
import { DraftEditorCard } from "@/components/ui/draft-editor-card";
import { DraftStatsCard } from "@/components/ui/draft-stats-card";
import {
  type DraftProgress,
  type UpdateDraftInput,
  type UpdateDraftOutput,
  type StartContentEvent,
  type EndContentEvent
} from "@/gensx/workflows";

export default function Home() {
  const [userMessage, setUserMessage] = useState("");

  const {inProgress, error, output, execution, run} = useWorkflow<UpdateDraftInput, UpdateDraftOutput>({
    config: {
      baseUrl: '/api/gensx',
    },
  });

  const draftProgress = useObject<DraftProgress>(execution, "draft-progress");

  const contentEvents = useEvents<StartContentEvent | EndContentEvent>(
    execution,
    "content-events",
    (event) => {
      console.log(`Content event: ${event.type} - ${event.content}`);
    }
  );

  const handleSubmit = async () => {
    await run({
      inputs: {
        userMessage: userMessage.trim(),
        currentDraft: output || ""
      }
    });
    setUserMessage("");
  };

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="flex flex-col min-h-0">
        <h1 className="text-3xl font-bold text-[#333333] font-atma text-center mb-4 flex-shrink-0">
          Draft Pad
        </h1>
        <DraftEditorCard
          output={draftProgress?.content || output || 'No content yet'}
          isStreaming={inProgress}
          error={error}
          userMessage={userMessage}
          onUserMessageChange={setUserMessage}
          onSubmit={handleSubmit}
          className="min-h-0"
        />
      </div>

      <DraftStatsCard draftProgress={draftProgress || null} />
    </div>
  );
}
