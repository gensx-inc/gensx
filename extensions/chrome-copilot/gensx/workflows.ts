/**
 * GenSX Chrome Copilot Workflows
 * Main entry point for the rearchitected extension workflows
 */

import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { CoreMessage } from "ai";
import { copilotWorkflow as newCopilotWorkflow } from "./copilot";

/**
 * Main workflow export - uses the new LLM-based architecture with:
 * - Task state machine and ReAct loop
 * - Skills system for reusable patterns  
 * - MiniPCD for real-time page understanding
 * - Site graph for navigation context
 * - Multi-tab exploration capabilities
 */
export const copilotWorkflow = newCopilotWorkflow;

/**
 * Chat history management for frontend state loading
 */
type ThreadData = {
  messages: CoreMessage[];
};

export const getChatHistoryWorkflow = gensx.Workflow(
  "fetchChatHistory",
  async ({ userId, threadId }: { userId: string; threadId: string }) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<ThreadData>(
      chatHistoryBlobPath(userId, threadId),
    );

    // Function to load thread data
    const loadThreadData = async (): Promise<ThreadData> => {
      const data = await chatHistoryBlob.getJSON();

      // Handle old format (array of messages) - convert to new format
      if (Array.isArray(data)) {
        return { messages: data };
      }

      return data ?? { messages: [] };
    };

    return await loadThreadData();
  },
);

function chatHistoryBlobPath(userId: string, threadId: string): string {
  return `chat-history/${userId}/${threadId}.json`;
}
