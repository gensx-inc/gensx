import { NextResponse } from "next/server";

interface WorkflowConfig {
  baseUrl: string;
  apiKey?: string;
}

const getWorkflowConfig = (): WorkflowConfig => {
  // Check for production environment (Vercel)
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV) {
    return {
      baseUrl:
        process.env.NEXT_PUBLIC_WORKFLOW_API_URL ||
        "https://api.your-domain.com",
      apiKey: process.env.NEXT_PUBLIC_WORKFLOW_API_KEY,
    };
  }

  // Development environment
  return {
    baseUrl: "http://localhost:1337",
    apiKey: undefined,
  };
};

export async function POST(request: Request) {
  const body = await request.json();

  const { baseUrl, apiKey } = getWorkflowConfig();

  const response = await fetch(baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GENSX_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify(body),
  });

  // Forward the response headers
  const headers = new Headers();
  response.headers.forEach((value, key) => {
    headers.set(key, value);
  });

  // Create a new response with the forwarded headers and body
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
