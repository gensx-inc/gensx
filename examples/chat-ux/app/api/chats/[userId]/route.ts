import { NextRequest, NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { ModelMessage } from "ai";

interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const prefix = `chat-history/${userId}/`;
    const response = await blobClient.listBlobs({ prefix });
    const blobs = response.blobs || [];

    const summaries: ThreadSummary[] = [];

    for (const blobInfo of blobs) {
      if (!blobInfo.key.endsWith(".json")) {
        continue;
      }

      const blob = await blobClient.getBlob<ModelMessage[]>(blobInfo.key);
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

    return NextResponse.json(summaries);
  } catch (error) {
    console.error("API: Error listing conversations for user:", error);
    return NextResponse.json([], { status: 500 });
  }
}
