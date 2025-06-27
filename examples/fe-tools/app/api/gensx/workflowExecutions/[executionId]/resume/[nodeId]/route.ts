import { GenSX } from "@gensx/client";
import { NextRequest } from "next/server";

const GENSX_ORG = process.env.GENSX_ORG;
const GENSX_PROJECT = process.env.GENSX_PROJECT ?? "chat-tools";
const GENSX_ENV = process.env.GENSX_ENV ?? "default";

const shouldUseLocalDevServer = () => {
  if (
    process.env.GENSX_BASE_URL &&
    !process.env.GENSX_BASE_URL.includes("localhost")
  ) {
    return false;
  }
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    return false;
  }
  return true;
};

/**
 * API route that acts as a pure passthrough to GenSX
 * Accepts the same parameters as the GenSX SDK
 *
 * This is designed to work with the useGenSX hook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string; nodeId: string }> },
) {
  try {
    const { executionId, nodeId } = await params;
    const data = await request.json();

    const useLocalDevServer = shouldUseLocalDevServer();

    // Get API key from environment (or could accept from Authorization header)
    let gensx: GenSX;
    if (!useLocalDevServer) {
      const apiKey =
        process.env.GENSX_API_KEY ??
        request.headers.get("authorization")?.replace("Bearer ", "");

      if (!apiKey) {
        return new Response(
          JSON.stringify({
            type: "error",
            error: "API key not configured",
          }) + "\n",
          {
            status: 401,
            headers: { "Content-Type": "application/x-ndjson" },
          },
        );
      }

      // Initialize GenSX SDK
      const baseUrl = process.env.GENSX_BASE_URL ?? "https://api.gensx.com";

      gensx = new GenSX({
        apiKey,
        baseUrl,
        org: GENSX_ORG,
        project: GENSX_PROJECT,
        environment: GENSX_ENV,
      });
    } else {
      gensx = new GenSX({
        baseUrl: process.env.GENSX_BASE_URL ?? "http://localhost:1337",
      });
    }

    // Use runRaw to get the direct response

    const response = await gensx.resume({
      executionId: executionId as string,
      nodeId: nodeId as string,
      data,
    });

    return response;
  } catch (error) {
    console.error("GenSX proxy error:", error);

    // Return error as a GenSX error event
    const errorEvent = {
      type: "error",
      error: error instanceof Error ? error.message : "Internal server error",
    };

    return new Response(JSON.stringify(errorEvent) + "\n", {
      status: 500,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }
}
