import { NextRequest, NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { MapMarker } from "@/hooks/useMapTools";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; threadId: string }> },
) {
  try {
    const { userId, threadId } = await params;

    const blobClient = new BlobClient({
      kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
    });

    const blobPath = `map-state/${userId}/${threadId}.json`;

    const blob = await blobClient.getBlob<{
      latitude: number;
      longitude: number;
      zoom: number;
      markers?: MapMarker[];
    }>(blobPath);

    const exists = await blob.exists();

    if (!exists) {
      return NextResponse.json(
        { message: "Map state not found" },
        { status: 404 },
      );
    }

    const mapState = await blob.getJSON();

    return NextResponse.json(
      mapState ?? {
        latitude: -33.8688,
        longitude: 151.2093,
        zoom: 12,
        markers: [],
      },
    );
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

    const blobPath = `map-state/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob(blobPath);

    // Check if the blob exists before trying to delete
    const exists = await blob.exists();
    if (!exists) {
      return NextResponse.json(
        { message: "Map state not found" },
        { status: 404 },
      );
    }

    await blob.delete();

    return NextResponse.json(
      { message: "Map state deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("API: Error deleting map state:", error);
    return NextResponse.json(
      { message: "Failed to delete map state" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; threadId: string }> },
) {
  const { userId, threadId } = await params;

  const blobClient = new BlobClient({
    kind: process.env.NODE_ENV === "production" ? "cloud" : "filesystem",
  });

  const blobPath = `map-state/${userId}/${threadId}.json`;
  const blob = blobClient.getBlob(blobPath);

  await blob.putJSON(await request.json());

  return NextResponse.json(
    { message: "Map state updated successfully" },
    { status: 200 },
  );
}
