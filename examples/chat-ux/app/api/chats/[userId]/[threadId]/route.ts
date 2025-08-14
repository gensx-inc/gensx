import { NextRequest, NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { ModelMessage } from "ai";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; threadId: string }> },
) {
  try {
    const { userId, threadId } = await params;

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;

    const blob = await blobClient.getBlob<ModelMessage[]>(blobPath);

    const exists = await blob.exists();

    if (!exists) {
      return NextResponse.json([]);
    }

    const convo = await blob.getJSON();

    return NextResponse.json(convo ?? []);
  } catch (error) {
    console.error("API: Error reading conversation:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; threadId: string }> },
) {
  try {
    const { userId, threadId } = await params;

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const blobPath = `chat-history/${userId}/${threadId}.json`;
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
