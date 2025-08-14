"use server";

import { BlobClient } from "@gensx/storage";
import { ModelMessage } from "ai";
import { shouldUseLocalDevServer } from "@/app/api/gensx/gensx";

export interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
}

export interface ThreadData {
  summary?: string;
  messages: ModelMessage[];
}

// Helper function to extract text content from ModelMessage
function extractTextContent(content: ModelMessage["content"]): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    // Extract text from TextPart objects
    return content
      .filter(
        (part): part is { type: "text"; text: string } => part.type === "text",
      )
      .map((part) => part.text)
      .join("");
  }

  return "";
}

export async function getChatHistory(
  userId: string,
  threadId: string,
): Promise<ModelMessage[]> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob<ThreadData>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      return [];
    }

    const threadData = await blob.getJSON();

    // Handle old format (array of messages) - convert to new format
    if (Array.isArray(threadData)) {
      return threadData;
    }

    return threadData?.messages ?? [];
  } catch (error) {
    console.error("Error reading chat history:", error);
    return [];
  }
}

export async function deleteChatHistory(
  userId: string,
  threadId: string,
): Promise<void> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob<ThreadData>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      throw new Error("Chat not found");
    }

    await blob.delete();
  } catch (error) {
    console.error("Error deleting chat history:", error);
    throw new Error("Failed to delete chat");
  }
}

export async function getThreadSummary(
  userId: string,
  threadId: string,
): Promise<string | null> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob<ThreadData>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      return null;
    }

    const threadData = await blob.getJSON();

    // Return summary or fall back to first user message
    if (threadData?.summary) {
      return threadData.summary;
    }

    const firstUserMessage = threadData?.messages?.find(
      (m) => m.role === "user",
    );
    return firstUserMessage
      ? extractTextContent(firstUserMessage.content) || "Untitled Chat"
      : "Untitled Chat";
  } catch (error) {
    console.error("Error reading thread summary:", error);
    return null;
  }
}

export async function getThreadSummaries(
  userId: string,
): Promise<ThreadSummary[]> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const prefix = `chat-history/${userId}/`;
    const response = await blobClient.listBlobs({ prefix });
    const blobs = response.blobs || [];

    const summaries: ThreadSummary[] = [];

    for (const blobInfo of blobs) {
      if (!blobInfo.key.endsWith(".json")) {
        continue;
      }

      const blob = await blobClient.getBlob<ThreadData>(blobInfo.key);
      const threadData = await blob.getJSON();

      // Handle old format (array of messages)
      let messages: ModelMessage[];
      let summary: string | undefined;

      if (Array.isArray(threadData)) {
        messages = threadData;
        summary = undefined;
      } else {
        messages = threadData?.messages || [];
        summary = threadData?.summary;
      }

      if (messages && messages.length > 0) {
        // Extract threadId from the path: chat-history/userId/threadId.json
        const threadId = blobInfo.key.replace(prefix, "").replace(".json", "");

        // Use summary if available, otherwise fall back to first user message
        let title: string;
        if (summary) {
          title = summary;
        } else {
          const firstUserMessage = messages.find((m) => m.role === "user");
          title = firstUserMessage
            ? extractTextContent(firstUserMessage.content) || "Untitled Chat"
            : "Untitled Chat";
        }

        // Get the last message
        const lastMessage = messages[messages.length - 1];
        const lastMessageText =
          extractTextContent(lastMessage.content) || "Recent message";

        summaries.push({
          id: threadId,
          title,
          lastMessage: lastMessageText,
        });
      }
    }

    // Sort by last activity (most recent first), assuming threadId is timestamp-based
    summaries.sort((a, b) => b.id.localeCompare(a.id));

    return summaries;
  } catch (error) {
    console.error("Error listing thread summaries:", error);
    return [];
  }
}
