import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";

import { SearchArxiv } from "./arxiv.js";
import { GradeDocument } from "./grader.js";
import { GenerateQueries } from "./queryGenerator.js";
import { ArxivSummary, FetchAndSummarize } from "./summarize.js";

interface CreateReportProps {
  results: ArxivSummary[];
  prompt: string;
}

export const CreateReport = gensx.Component(
  "CreateReport",
  async ({ results, prompt }: CreateReportProps): Promise<string> => {
    const systemMessage = `You are an experienced researcher. You have summaries of relevant research papers. Write a report answering the user's prompt using the papers provided. Make sure to provide links to the relevant papers.`;

    const userMessage = `Here is the prompt:
<prompt>
${prompt}
</prompt>

Here are the relevant research papers:
${results
  .map(
    (paper) => `
<paper>
  <title>
    ${paper.title}
  </title>
  <url>
    ${paper.url}
  </url>
  <summary>
    ${paper.summary}
  </summary>
</paper>`,
  )
  .join("\n")}

Please write a report answering the user's prompt using the papers provided.`;

    const response = await generateText({
      model: openai("gpt-4o"),
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

interface ResearchProps {
  prompt: string;
  queries: string[];
}

export const Research = gensx.Component(
  "Research",
  async ({ queries, prompt }: ResearchProps): Promise<ArxivSummary[]> => {
    console.log("\n=== Queries ===");
    queries.forEach((query, i) => {
      console.log(`Query ${i + 1}: ${query}`);
    });

    // Process all queries in parallel
    const allSearchResults = await Promise.all(
      queries.map((query) => SearchArxiv({ query, maxResults: 3 })),
    );

    // Flatten results and deduplicate by URL
    const uniqueUrls = new Set<string>();
    const documents: ArxivSummary[] = [];

    // Process all documents in parallel
    const processedDocuments = await Promise.all(
      allSearchResults.flat().map(async (document) => {
        // Skip if we've already seen this URL
        if (uniqueUrls.has(document.url)) {
          return null;
        }
        uniqueUrls.add(document.url);

        // Grade the document
        const isUseful = await GradeDocument({ prompt, document });
        if (!isUseful) {
          return null;
        }

        // Fetch and summarize
        return await FetchAndSummarize({ document, prompt });
      }),
    );

    // Filter out null results and add to documents array
    documents.push(
      ...processedDocuments.filter((doc): doc is ArxivSummary => doc !== null),
    );

    console.log("\n=== Documents ===");
    documents.forEach((doc, i) => {
      console.log(`Document ${i + 1}: ${doc.title}`);
    });

    return documents;
  },
);

interface DeepResearchProps {
  prompt: string;
}

export const DeepResearch = gensx.Workflow(
  "DeepResearch",
  async ({ prompt }: DeepResearchProps): Promise<string> => {
    const { queries } = await GenerateQueries({ prompt });
    const results = await Research({ queries, prompt });
    return await CreateReport({ results, prompt });
  },
);
