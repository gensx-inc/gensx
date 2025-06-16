import { GenSX } from "@gensx/client";
import { NextRequest } from "next/server";

type RequestBody = {
  [key: string]: unknown;
}

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
export async function POST(request: NextRequest) {
  try {
    const inputs = (await request.json()) as RequestBody;

    const useLocalDevServer = shouldUseLocalDevServer();

    // Hardcode workflow configuration for draft-pad
    const workflowName = "updateDraft";
    const org = "gensx";
    const project = "draft-pad";
    const environment = "default";
    const format = "ndjson";

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      gensx = new GenSX({
        apiKey,
        baseUrl,
        org,
        project,
        environment,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      gensx = new GenSX({
        baseUrl: process.env.GENSX_BASE_URL ?? "http://localhost:1337",
      });
    }

    // Use runRaw to get the direct response
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const response = await gensx.runRaw(workflowName, {
      inputs,
      format: format ?? "ndjson", // Default to ndjson if not specified
    });

    // Determine content type based on format
    const responseFormat = format ?? "ndjson";
    const contentType = {
      sse: "text/event-stream",
      ndjson: "application/x-ndjson",
      json: "application/json",
    }[responseFormat];

    // Return the response directly to the client
    // This preserves the response format
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    return new Response(response.body, {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      status: response.status,
      headers: {
        "Content-Type": contentType,
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

export function GET() {
  return new Response(
    JSON.stringify(
      {
        message: "GenSX Draft-Pad API",
        description:
          "This endpoint runs the updateDraft workflow with hardcoded configuration",
        workflow: {
          workflowName: "updateDraft",
          org: "gensx",
          project: "draft-pad",
          environment: "default",
        },
        usage: {
          method: "POST",
          body: {
            userMessage: "The user's message for updating the draft",
            currentDraft: "The current draft content (optional)",
          },
          example: {
            userMessage: "Make this more concise",
            currentDraft: "This is the current draft content...",
          },
        },
        authentication: {
          option1: "Set GENSX_API_KEY environment variable",
          option2: "Pass Authorization header with Bearer token",
        },
        environment: {
          GENSX_BASE_URL: "GenSX base URL (defaults to https://api.gensx.com for production, http://localhost:1337 for development)",
        },
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
}
