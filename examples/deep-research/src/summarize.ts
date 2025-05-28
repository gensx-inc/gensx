import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";

import { ArxivEntry } from "./arxiv.js";
import { ScrapePage } from "./firecrawl.js";

export interface SummarizePaperProps {
  markdown: string;
  prompt: string;
}

export const SummarizePaper = gensx.Component(
  "SummarizePaper",
  async ({ markdown, prompt }: SummarizePaperProps): Promise<string> => {
    const systemMessage = `Your job is to provide a contextual research summary of a research summary based on the prompt provided.`;

    const userMessage = `Here is the prompt:
<prompt>
${prompt}
</prompt>

Here is the paper:
<paper>
${markdown}
</paper>

Please return a detailed yet concise summary of the paper that is relevant to the user's prompt.`;

    const response = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        { role: "user", content: userMessage },
      ],
    });

    return response.text;
  },
);

export interface FetchAndSummarizeProps {
  document: ArxivEntry;
  prompt: string;
}

export interface ArxivSummary {
  url: string;
  title: string;
  summary: string;
}

export const FetchAndSummarize = gensx.Component(
  "FetchAndSummarize",
  async ({
    document,
    prompt,
  }: FetchAndSummarizeProps): Promise<ArxivSummary> => {
    const url = document.url.replace("abs", "html"); // getting the url to the html version of the paper

    const markdown = await ScrapePage({ url });
    const summary = await SummarizePaper({ markdown, prompt });

    return {
      title: document.title,
      url: url,
      summary,
    };
  },
);
