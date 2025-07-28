"use server";

import { BlobClient } from "@gensx/storage";

export async function getApplicationWorkingMemory(
  userId: string,
): Promise<string> {
  try {
    const blobClient = new BlobClient();
    const domain = "localhost"; // Default domain for local development
    const blob = blobClient.getBlob(`application-memory/${userId}/${domain}`);

    const exists = await blob.exists();
    if (!exists) {
      return "";
    }

    const content = await blob.getString();
    return content || "";
  } catch (error) {
    console.error("Error fetching application working memory:", error);
    return "";
  }
}

export async function updateApplicationWorkingMemory(
  userId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const blobClient = new BlobClient();
    const domain = "localhost";
    const blob = blobClient.getBlob(`application-memory/${userId}/${domain}`);

    await blob.putString(content);

    return { success: true };
  } catch (error) {
    console.error("Error updating application working memory:", error);
    return {
      success: false,
      error: "Failed to update application working memory",
    };
  }
}
