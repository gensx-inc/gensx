import { NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { CoreMessage } from "ai";

interface ThreadSummary {
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

      const blob = await blobClient.getBlob<CoreMessage[]>(blobInfo.key);
      const messages = await blob.getJSON();

      if (messages && messages.length > 0) {
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
    console.error("API: Error listing conversations:", error);
    return NextResponse.json([], { status: 500 });
  }
}
