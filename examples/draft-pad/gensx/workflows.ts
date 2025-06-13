import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { streamText } from "@gensx/vercel-ai";

import { BaseProgressEvent } from "./event-types.js";

type StartContentEvent = BaseProgressEvent & {
  type: "startContent";
  content: string;
};

type EndContentEvent = BaseProgressEvent & {
  type: "endContent";
  content: string;
};

interface UpdateDraftInputs {
  userMessage: string;
  currentDraft: string;
}

const UpdateDraftWorkflow = gensx.Workflow(
  "updateDraft",
  ({ userMessage, currentDraft }: UpdateDraftInputs) => {
    // Emit start event
    const startContentEvent: StartContentEvent = {
      type: "startContent",
      content: "draftContent",
    };
    gensx.emitProgress(JSON.stringify(startContentEvent));

    // Simple system prompt based on whether we have existing content
    let systemPrompt = currentDraft
      ? "You are a helpful assistant that updates draft content based on user instructions. Return only the updated content, no explanations."
      : "You are a helpful assistant that creates content based on user instructions. Return only the content, no explanations.";

    systemPrompt += `You only return markdown for the updated content and not any other type of formatted text.`;

    const userPrompt = currentDraft
      ? `Current content:\n${currentDraft}\n\nPlease update it based on: ${userMessage}`
      : `Please create content based on: ${userMessage}`;

    // Stream the response
    const result = streamText({
      model: openai("gpt-4.1-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // Return async generator function
    const generator = async function* () {
      for await (const chunk of result.textStream) {
        yield chunk;
      }
      const endContentEvent: EndContentEvent = {
        type: "endContent",
        content: "draftContent",
      };
      gensx.emitProgress(JSON.stringify(endContentEvent));
    };

    return generator();
  },
);

export { UpdateDraftWorkflow, type StartContentEvent, type EndContentEvent };
