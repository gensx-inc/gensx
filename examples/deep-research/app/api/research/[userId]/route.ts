import { NextRequest, NextResponse } from "next/server";
import { BlobClient } from "@gensx/storage";
import { DeepResearchOutput } from "../../../../gensx/workflows";

interface ThreadSummary {
  id: string;
  title: string;
  lastMessage: string;
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

    const prefix = `deep-research/${userId}/`;
    const response = await blobClient.listBlobs({ prefix });
    const blobs = response.blobs || [];

    const summaries: ThreadSummary[] = [];

    for (const blobInfo of blobs) {
      if (!blobInfo.key.endsWith(".json")) {
        continue;
      }

      const blob = await blobClient.getBlob<DeepResearchOutput>(blobInfo.key);
      const researchData = await blob.getJSON();

      if (researchData) {
        // Extract threadId from the path: deep-research/userId/threadId.json
        const threadId = blobInfo.key.replace(prefix, "").replace(".json", "");

        // Use the research prompt as the title, truncated if too long
        const title = researchData.prompt
          ? researchData.prompt.length > 60
            ? researchData.prompt.substring(0, 60) + "..."
            : researchData.prompt
          : "Untitled Research";

        // Use the beginning of the report as the last message, or a status indicator
        let lastMessage = "Research completed";
        if (researchData.report && researchData.report.length > 0) {
          lastMessage =
            researchData.report.length > 100
              ? researchData.report.substring(0, 100) + "..."
              : researchData.report;
        } else if (researchData.plan?.queries?.length > 0) {
          lastMessage = `Research plan with ${researchData.plan.queries.length} queries`;
        }

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
    console.error("API: Error listing research for user:", error);
    return NextResponse.json([], { status: 500 });
  }
}
