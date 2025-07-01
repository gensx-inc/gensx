import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { streamText } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

interface GenerateReportParams {
  prompt: string;
  documents: SearchResult[];
}

export const GenerateReport = gensx.Component(
  "GenerateReport",
  async ({ prompt, documents }: GenerateReportParams) => {
    const systemMessage = `You are an expert researcher.`;
    const fullPrompt = `Given the following prompt and documents, please generated a detailed report.

<prompt>
${prompt}
</prompt>

<documents>
${documents
  .map(
    (document) => `<document>
  <title>${document.title}</title>
  <url>${document.url}</url>
  <content>${document.content ?? document.description}</content>
</document>`,
  )
  .join("\n")}
</documents>
`;

    const response = await streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        { role: "user", content: fullPrompt },
      ],
    });

    let text = "";
    for await (const chunk of response.textStream) {
      text += chunk;
      gensx.publishObject("report", text);
    }

    return text;
  },
);
