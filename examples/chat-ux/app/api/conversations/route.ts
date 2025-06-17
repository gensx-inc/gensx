import { NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
}

export async function GET() {
  try {
    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const prefix = "chat-history/";
    const response = await blobClient.listBlobs({ prefix });
    const blobs = response.blobs || [];

    const summaries: ThreadSummary[] = [];

    for (const blobInfo of blobs) {
      if (!blobInfo.key.endsWith(".json")) {
        continue;
      }

      const blob = await blobClient.getBlob<ChatCompletionMessageParam[]>(
        blobInfo.key,
      );
      const messages = await blob.getJSON();

      if (messages && messages.length > 0) {
        const threadId = blobInfo.key.replace(prefix, "").replace(".json", "");

        // Find the first user message for the title
        const firstUserMessage = messages.find((m) => m.role === "user");
        let title = "Untitled Chat";
        if (firstUserMessage && typeof firstUserMessage.content === "string") {
          title = firstUserMessage.content;
        }

        // Get the last message
        const lastMessageContent = messages[messages.length - 1].content;
        const lastMessage =
          typeof lastMessageContent === "string"
            ? lastMessageContent
            : "[non-text message]";

        summaries.push({
          id: threadId,
          title,
          lastMessage,
        });
      }
    }

    // Sort by last activity (most recent first), assuming threadId is timestamp-based
    summaries.sort((a, b) => b.id.localeCompare(a.id));

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("API: Error listing conversations:", error);
    return NextResponse.json([], { status: 500 });
  }
}
