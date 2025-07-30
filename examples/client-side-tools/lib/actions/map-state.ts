"use server";

import { BlobClient } from "@gensx/storage";
import { MapMarker, MapView, RouteData } from "@/hooks/useMapTools";
import { shouldUseLocalDevServer } from "@/app/api/gensx/gensx";

type MapState = MapView & {
  markers?: MapMarker[];
  route?: RouteData | null;
};

export async function getMapState(
  userId: string,
  threadId: string,
): Promise<MapState | null> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `map-state/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob<MapState>(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      return null;
    }

    const mapState = await blob.getJSON();
    return (
      mapState ?? {
        latitude: 37.7749, // San Francisco
        longitude: -122.4194,
        zoom: 12,
        markers: [],
        route: null,
      }
    );
  } catch (error) {
    console.error("Error reading map state:", error);
    throw new Error("Failed to read map state");
  }
}

export async function updateMapState(
  userId: string,
  threadId: string,
  mapState: MapState,
): Promise<void> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `map-state/${userId}/${threadId}.json`;
    const blob = blobClient.getBlob(blobPath);

    await blob.putJSON(mapState);
  } catch (error) {
    console.error("Error updating map state:", error);
    throw new Error("Failed to update map state");
  }
}

export async function deleteMapState(
  userId: string,
  threadId: string,
): Promise<void> {
  try {
    const blobClient = new BlobClient({
      kind: shouldUseLocalDevServer() ? "filesystem" : "cloud",
    });

    const blobPath = `map-state/${userId}/${threadId}.json`;
    const blob = await blobClient.getBlob(blobPath);

    const exists = await blob.exists();
    if (!exists) {
      throw new Error("Map state not found");
    }

    await blob.delete();
  } catch (error) {
    console.error("Error deleting map state:", error);
    throw new Error("Failed to delete map state");
  }
}
