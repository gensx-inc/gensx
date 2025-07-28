"use server";

import { BlobClient } from "@gensx/storage";

export async function getUserPreferencesWorkingMemory(
  userId: string,
): Promise<string> {
  try {
    const blobClient = new BlobClient();
    const blob = blobClient.getBlob(`user-preferences/${userId}`);

    const exists = await blob.exists();
    if (!exists) {
      return "";
    }

    const content = await blob.getString();
    return content || "";
  } catch (error) {
    console.error("Error fetching user preferences working memory:", error);
    return "";
  }
}

export async function updateUserPreferencesWorkingMemory(
  userId: string,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const blobClient = new BlobClient();
    const blob = blobClient.getBlob(`user-preferences/${userId}`);

    await blob.putString(content);

    return { success: true };
  } catch (error) {
    console.error("Error updating user preferences working memory:", error);
    return {
      success: false,
      error: "Failed to update user preferences working memory",
    };
  }
}
