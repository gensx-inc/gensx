import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

import { ArxivEntry, ArxivSearch } from "./arxiv.js";
import { GradeDocument } from "./grader.js";
import { QueryGenerator } from "./queryGenerator.js";
import { ArxivSummary, FetchAndSummarize } from "./summarize.js";

interface CreateReportProps {
  results: ArxivSummary[];
  prompt: string;
}

export const CreateReport = gsx.Component<CreateReportProps, string>(
  "CreateReport",
  ({ results, prompt }) => {
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

    return (
      <ChatCompletion
        model="gpt-4o"
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

interface ResearchProps {
  prompt: string;
  queries: string[];
}

export const Research = gsx.Component<ResearchProps, ArxivSummary[]>(
  "Research",
  async ({ queries, prompt }) => {
    console.log("\n=== Queries ===");
    queries.forEach((query, i) => {
      console.log(`Query ${i + 1}: ${query}`);
    });

    // get search results and grade documents
    const documents: ArxivEntry[] = await gsx
      .array<string>(queries)
      .flatMap<ArxivEntry>((query) => (
        <ArxivSearch query={query} maxResults={3} />
      ))
      .filter((document) => (
        <GradeDocument prompt={prompt} document={document} />
      ))
      .toArray();

    // filter out and deduplicate documents
    const uniqueDocuments = [
      ...new Map(documents.map((doc) => [doc.url, doc])).values(),
    ];

    console.log("\n=== Documents ===");
    uniqueDocuments.forEach((doc, i) => {
      console.log(`Document ${i + 1}: ${doc.title}`);
    });

    // scrape and summarize the papers
    return await gsx
      .array(uniqueDocuments)
      .map<ArxivSummary>((document) => (
        <FetchAndSummarize document={document} prompt={prompt} />
      ))
      .toArray();
  },
);

interface DeepResearchProps {
  prompt: string;
}

export const DeepResearchWorkflow = gsx.Component<DeepResearchProps, string>(
  "DeepResearchWorkflow",
  ({ prompt }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <QueryGenerator prompt={prompt}>
          {({ queries }) => (
            <Research queries={queries} prompt={prompt}>
              {(results) => <CreateReport results={results} prompt={prompt} />}
            </Research>
          )}
        </QueryGenerator>
      </OpenAIProvider>
    );
  },
);
