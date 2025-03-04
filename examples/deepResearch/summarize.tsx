import * as gensx from "@gensx/core";
import { ChatCompletion } from "@gensx/openai";

import { ArxivEntry } from "./arxiv.js";
import { FirecrawlProvider, ScrapePage } from "./firecrawlProvider.js";

export interface SummarizePaperProps {
  markdown: string;
  prompt: string;
}

export const SummarizePaper = gensx.Component<SummarizePaperProps, string>(
  "SummarizePaper",
  ({ markdown, prompt }) => {
    const systemMessage = `Your job is to provide a contextual research summary of a research summary based on the prompt provided.`;

    const userMessage = ` Here is the prompt:
      <prompt>
      ${prompt}
      </prompt>

      Here is the paper:
      <paper>
      ${markdown}
      </paper>

      Please return a detailed yet concise summary of the paper that is relevant to the user's prompt.`;
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "system",
            content: systemMessage,
          },
          { role: "user", content: userMessage },
        ]}
      />
    );
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

export const FetchAndSummarize = gensx.Component<
  FetchAndSummarizeProps,
  ArxivSummary
>("FetchAndSummarize", ({ document, prompt }) => {
  const url = document.url.replace("abs", "html"); //  getting the url to the html version of the paper
  return {
    title: document.title,
    url: url,
    summary: (
      <FirecrawlProvider apiKey={process.env.FIRECRAWL_API_KEY}>
        <ScrapePage url={url}>
          {(markdown: string | null) =>
            markdown && <SummarizePaper markdown={markdown} prompt={prompt} />
          }
        </ScrapePage>
      </FirecrawlProvider>
    ),
  };
});
