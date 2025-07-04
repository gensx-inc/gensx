import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { streamText } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";

interface GenerateReportParams {
  prompt: string;
  researchBrief: string;
  documents: SearchResult[];
  updateStep: (report: string) => void | Promise<void>;
}

export const GenerateReport = gensx.Component(
  "GenerateReport",
  async ({
    prompt,
    researchBrief,
    documents,
    updateStep,
  }: GenerateReportParams) => {
    const systemMessage = `You are an expert researcher.`;
    const fullPrompt = `Given the following prompt, research brief, and sources, please generate a detailed report with proper citations.

<prompt>
${prompt}
</prompt>

<researchBrief>
${researchBrief}
</researchBrief>

<sources>
${documents
  .map(
    (document) => `<document>
  <title>${document.title}</title>
  <url>${document.url}</url>
  <content>${document.content ?? document.description}</content>
</document>`,
  )
  .join("\n")}
</sources>

IMPORTANT: When writing the report, include citations wherever possible for facts, claims, and information you reference from the sources. Use markdown links for the numeric citations like this: [[1]](URL)

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
      maxTokens: 32000,
    });

    let text = "";
    for await (const chunk of response.textStream) {
      text += chunk;
      await updateStep(text);
    }

    return text;
  },
);
