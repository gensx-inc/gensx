import { GenSX } from "@gensx/client";
import { NextRequest } from "next/server";
import {
  GENSX_ENV,
  GENSX_ORG,
  GENSX_PROJECT,
  shouldUseLocalDevServer,
} from "../../../gensx";

/**
 * API route that acts as a pure passthrough to GenSX
 * Accepts the same parameters as the GenSX SDK
 *
 * This is designed to work with the useGenSX hook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> },
) {
  try {
    const { executionId } = await params;

    const useLocalDevServer = shouldUseLocalDevServer();

    // Get API key from environment (or could accept from Authorization header)
    let gensx: GenSX;
    if (!useLocalDevServer) {
      const apiKey =
        process.env.GENSX_API_KEY ??
        request.headers.get("Authorization")?.replace("Bearer ", "");

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
        overrideLocalMode: true,
      });
    } else {
      gensx = new GenSX({
        baseUrl: process.env.GENSX_BASE_URL ?? "http://localhost:1337",
      });
    }

    const response = await gensx.getProgress({
      executionId,
    });

    const transform = new TransformStream({
      transform(chunk, controller) {
        const textDecoder = new TextDecoder("utf-8");
        const text = textDecoder.decode(chunk);
        controller.enqueue(text + "\n");
      },
    });

    return new Response(response.pipeThrough(transform), {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
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
