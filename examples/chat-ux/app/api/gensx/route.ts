import { GenSX } from "@gensx/client";
import { NextRequest } from "next/server";

interface RequestBody {
  workflowName: string;
  org?: string;
  project?: string;
  environment?: string;
  format?: "sse" | "ndjson" | "json";
  [key: string]: unknown; // For additional inputs
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
    const body = (await request.json()) as RequestBody;
    const { workflowName, org, project, environment, format, ...inputs } = body;

    const useLocalDevServer = shouldUseLocalDevServer();

    // Validate required fields
    if (!workflowName) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: "workflowName is required",
        }) + "\n",
        {
          status: 400,
          headers: { "Content-Type": "application/x-ndjson" },
        },
      );
    }

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

      // Use defaults from environment if not provided in request
      const finalOrg = org ?? process.env.GENSX_ORG;
      const finalProject = project ?? process.env.GENSX_PROJECT;
      const finalEnvironment = environment ?? process.env.GENSX_ENVIRONMENT;

      if (!finalOrg || !finalProject || !finalEnvironment) {
        return new Response(
          JSON.stringify({
            type: "error",
            error:
              "org, project, and environment are required (either in request or environment)",
          }) + "\n",
          {
            status: 400,
            headers: { "Content-Type": "application/x-ndjson" },
          },
        );
      }

      // Initialize GenSX SDK
      const baseUrl = process.env.GENSX_BASE_URL ?? "https://api.gensx.com";

      gensx = new GenSX({
        apiKey,
        baseUrl,
        org: finalOrg,
        project: finalProject,
        environment: finalEnvironment,
      });
    } else {
      gensx = new GenSX({
        baseUrl: process.env.GENSX_BASE_URL ?? "http://localhost:1337",
      });
    }

    // Use runRaw to get the direct response

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

    return new Response(response.body, {
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
