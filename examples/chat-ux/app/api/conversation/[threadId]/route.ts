import { NextRequest, NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;
    //console.log("=== GET /api/conversation/[threadId] CALLED ===");
    //console.log("API: Reading conversation for threadId:", threadId);

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const blobPath = `chat-history/${threadId}.json`;
    //console.log("API: Looking for blob at path:", blobPath);

    const blob =
      await blobClient.getBlob<ChatCompletionMessageParam[]>(blobPath);

    //console.log("API: Blob object:", blob);

    // Check if blob exists
    const exists = await blob.exists();
    //console.log("API: Blob exists:", exists);

    if (!exists) {
      //console.log("API: Blob does not exist, returning empty array");
      return NextResponse.json([]);
    }

    const convo = await blob.getJSON();
    //console.log("API: Raw blob content:", convo);
    //console.log("API: Content type:", typeof convo);
    //console.log("API: Is array:", Array.isArray(convo));
    //console.log("API: Returning:", convo ?? []);

    return NextResponse.json(convo ?? []);
  } catch (error) {
    console.error("API: Error reading conversation:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await params;

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const blobPath = `chat-history/${threadId}.json`;
    const blob = await blobClient.getBlob(blobPath);

    // Check if the blob exists before trying to delete
    const exists = await blob.exists();
    if (!exists) {
      return NextResponse.json({ message: "Chat not found" }, { status: 404 });
    }

    await blob.delete();

    return NextResponse.json(
      { message: "Chat deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("API: Error deleting conversation:", error);
    return NextResponse.json(
      { message: "Failed to delete chat" },
      { status: 500 },
    );
  }
}
