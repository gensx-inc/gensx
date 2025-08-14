import * as gensx from "@gensx/core";
import { SearchResult } from "../types";
import { streamText } from "@gensx/vercel-ai";
import { anthropic } from "@ai-sdk/anthropic";
import Anthropic from "@anthropic-ai/sdk";

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
    const buildPrompt = (
      docs: SearchResult[],
    ): string => `Given the following prompt, research brief, and sources, please generate a detailed report with proper citations.

<prompt>
${prompt}
</prompt>

<researchBrief>
${researchBrief}
</researchBrief>

<sources>
${docs
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

    const MAX_OUTPUT_TOKENS = 32000;
    const MODEL_TOKEN_LIMIT = 200000;
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
    });

    const docs = [...documents];
    let fullPrompt = buildPrompt(docs);
    const anthropicMessages: Anthropic.MessageParam[] = [
      { role: "user", content: fullPrompt },
    ];

    let tokenCount = (
      await client.messages.countTokens({
        model: "claude-sonnet-4-20250514",
        messages: anthropicMessages,
        system: systemMessage,
      })
    ).input_tokens;

    // Remove lowest ranked documents until within token limit
    docs.sort((a, b) => (a.relevanceScore ?? 0) - (b.relevanceScore ?? 0));
    while (
      tokenCount + MAX_OUTPUT_TOKENS > MODEL_TOKEN_LIMIT &&
      docs.length > 0
    ) {
      docs.shift();
      fullPrompt = buildPrompt(docs);
      anthropicMessages[0] = { role: "user", content: fullPrompt };
      tokenCount = (
        await client.messages.countTokens({
          model: "claude-sonnet-4-20250514",
          messages: anthropicMessages,
          system: systemMessage,
        })
      ).input_tokens;
    }

    const response = await streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemMessage,
      messages: [{ role: "user", content: fullPrompt }],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    let text = "";
    for await (const chunk of response.textStream) {
      text += chunk;
      await updateStep(text);
    }

    return text;
  },
);
