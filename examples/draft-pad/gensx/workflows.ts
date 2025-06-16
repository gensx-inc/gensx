import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";

// Workflow with merged draft and progress state
// Updated: Combined DraftState and ProgressUpdate into single DraftProgress
type StartContentEvent = {
  type: "startContent";
  content: string;
};

type EndContentEvent = {
  type: "endContent";
  content: string;
};

// Single comprehensive state object
type DraftProgress = {
  type: "draft-progress";
  // Status information
  status: "idle" | "generating" | "complete";
  stage:
    | "initializing"
    | "generating"
    | "streaming"
    | "finalizing"
    | "complete";
  percentage: number;
  message: string;
  // Content information
  content: string;
  wordCount: number;
  charCount: number;
  lastUpdated: string;
};

type UpdateDraftInput = {
  userMessage: string;
  currentDraft: string;
};

type UpdateDraftOutput = string;

const UpdateDraftWorkflow = gensx.Workflow(
  "updateDraft",
  ({ userMessage, currentDraft }: UpdateDraftInput) => {
    const draftProgress: DraftProgress = {
      type: "draft-progress",
      status: "generating",
      stage: "initializing",
      percentage: 0,
      message: "Starting content generation...",
      content: currentDraft,
      wordCount: currentDraft.split(/\s+/).filter((word) => word.length > 0)
        .length,
      charCount: currentDraft.length,
      lastUpdated: new Date().toISOString(),
    };
    // Publish initial state
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Publish start event (for useEvent hook)
    gensx.publishEvent<StartContentEvent>("content-events", {
      type: "startContent",
      content: "draftContent",
    });

    // Simple system prompt based on whether we have existing content
    let systemPrompt = currentDraft
      ? "You are a helpful assistant that updates draft content based on user instructions. Return only the updated content, no explanations."
      : "You are a helpful assistant that creates content based on user instructions. Return only the content, no explanations.";

    systemPrompt += `You only return markdown for the updated content and not any other type of formatted text.`;

    const userPrompt = currentDraft
      ? `Current content:\n${currentDraft}\n\nPlease update it based on: ${userMessage}`
      : `Please create content based on: ${userMessage}`;

    draftProgress.stage = "generating";
    draftProgress.percentage = 25;
    draftProgress.message = "Generating content with AI...";
    draftProgress.content = currentDraft;
    draftProgress.wordCount = currentDraft
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    draftProgress.charCount = currentDraft.length;
    draftProgress.lastUpdated = new Date().toISOString();
    // Update progress to generating stage
    gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

    // Stream the response
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // Return async generator function
    const generator = async function* () {
      let generatedContent = "";
      let chunkCount = 0;

      for await (const chunk of result.textStream) {
        generatedContent += chunk;
        chunkCount++;

        draftProgress.content = generatedContent;
        gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

        // Update progress every 10 chunks
        if (chunkCount % 10 === 0) {
          const words = generatedContent
            .split(/\s+/)
            .filter((word) => word.length > 0);
          draftProgress.stage = "streaming";
          draftProgress.percentage = Math.min(50 + chunkCount * 2, 90);
          draftProgress.message = `Generated ${generatedContent.length} characters...`;
          draftProgress.wordCount = words.length;
          draftProgress.charCount = generatedContent.length;
          draftProgress.lastUpdated = new Date().toISOString();
          gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
        }
        yield chunk;
      }

      // Final progress update - finalizing
      const finalWords = generatedContent
        .split(/\s+/)
        .filter((word) => word.length > 0);
      draftProgress.stage = "finalizing";
      draftProgress.percentage = 95;
      draftProgress.message = "Finalizing content...";
      draftProgress.wordCount = finalWords.length;
      draftProgress.charCount = generatedContent.length;
      draftProgress.lastUpdated = new Date().toISOString();
      gensx.publishObject<DraftProgress>("draft-progress", draftProgress);

      // Publish end event
      gensx.publishEvent<EndContentEvent>("content-events", {
        type: "endContent",
        content: "draftContent",
      });

      // Final complete state
      draftProgress.status = "complete";
      draftProgress.stage = "complete";
      draftProgress.percentage = 100;
      draftProgress.message = "Content generation complete!";
      draftProgress.content = generatedContent;
      draftProgress.wordCount = finalWords.length;
      draftProgress.charCount = generatedContent.length;
      draftProgress.lastUpdated = new Date().toISOString();
      gensx.publishObject<DraftProgress>("draft-progress", draftProgress);
    };

    return generator();
  },
);

export {
  UpdateDraftWorkflow,
  type StartContentEvent,
  type EndContentEvent,
  type DraftProgress,
  type UpdateDraftInput,
  type UpdateDraftOutput,
};
