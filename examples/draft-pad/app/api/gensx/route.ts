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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const gensx = new GenSX({
      apiKey,
      baseUrl,
      org: finalOrg,
      project: finalProject,
      environment: finalEnvironment,
    });

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
        message: "GenSX Passthrough API",
        description:
          "This endpoint accepts the same parameters as the GenSX SDK and passes them through",
        usage: {
          method: "POST",
          body: {
            workflowName: "Name of the GenSX workflow to run (required)",
            org: "Organization name (optional if set in environment)",
            project: "Project name (optional if set in environment)",
            environment: "Environment name (optional)",
            format:
              'Response format: "sse" | "ndjson" | "json" (optional, defaults to "ndjson")',
            "...inputs": "Any other fields are passed as workflow inputs",
          },
          example: {
            workflowName: "ChatWorkflow",
            org: "my-org",
            project: "my-project",
            environment: "production",
            format: "ndjson",
            userMessage: "Hello, how can you help me?",
          },
        },
        authentication: {
          option1: "Set GENSX_API_KEY environment variable",
          option2: "Pass Authorization header with Bearer token",
        },
        defaults: {
          GENSX_ORG: "Default organization if not provided in request",
          GENSX_PROJECT: "Default project if not provided in request",
          GENSX_ENVIRONMENT: "Default environment if not provided in request",
          GENSX_BASE_URL: "GenSX base URL (defaults to https://api.gensx.com)",
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
