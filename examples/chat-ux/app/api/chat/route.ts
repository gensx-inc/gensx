import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  const response = await fetch(
    "https://api.gensx.com/org/gensx/projects/chat-tools/environments/default/workflows/OpenAIAgentWorkflow",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GENSX_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
      body: JSON.stringify(body),
    },
  );

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
