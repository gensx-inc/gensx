"use server";

import { BlobClient } from "@gensx/storage";
import { CoreMessage } from "ai";
import { shouldUseLocalDevServer } from "@/app/api/gensx/gensx";

export interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
}

// Helper function to extract text content from CoreMessage
function extractTextContent(content: CoreMessage["content"]): string {
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
): Promise<CoreMessage[]> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob<CoreMessage[]>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      return [];
    }

    const conversation = await blob.getJSON();
    return conversation ?? [];
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
    const blob = await blobClient.getBlob(blobPath);

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

      const blob = await blobClient.getBlob<CoreMessage[]>(blobInfo.key);
      const messages = await blob.getJSON();

      if (messages && messages.length > 0) {
        // Extract threadId from the path: chat-history/userId/threadId.json
        const threadId = blobInfo.key.replace(prefix, "").replace(".json", "");

        // Find the first user message for the title
        const firstUserMessage = messages.find((m) => m.role === "user");
        const title = firstUserMessage
          ? extractTextContent(firstUserMessage.content) || "Untitled Chat"
          : "Untitled Chat";

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