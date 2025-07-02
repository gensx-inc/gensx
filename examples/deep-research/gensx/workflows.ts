import * as gensx from "@gensx/core";
import { WriteQueries } from "./deep-research/write-queries";
import { Plan } from "./deep-research/plan";
import { SearchResult } from "./types";
import { GenerateReport } from "./deep-research/generate-report";
import { useBlob } from "@gensx/storage";
import { ExecuteQueries } from "./deep-research/execute-queries";
import { Scrape } from "./deep-research/scrape";

export interface DeepResearchParams {
  prompt: string;
  userId: string;
  threadId: string;
}

export interface DeepResearchOutput {
  report: string;
  prompt: string;
  researchBrief: string;
  queries: string[];
  searchResults: SearchResult[];
}

export const DeepResearch = gensx.Workflow(
  "DeepResearch",
  async ({ prompt, userId, threadId }: DeepResearchParams) => {
    // Get blob instance for deep research storage
    const deepResearchBlob = useBlob<DeepResearchOutput>(
      `deep-research/${userId}/${threadId}.json`,
    );

    // Function to save deep research output
    const saveResearch = async (data: DeepResearchOutput): Promise<void> => {
      await deepResearchBlob.putJSON(data);
    };

    try {
      const output: DeepResearchOutput = {
        prompt,
        report: "",
        researchBrief: "",
        queries: [],
        searchResults: [],
      };

      const updateStatus = gensx.createObjectStream<string>("status");

      updateStatus("Planning");
      output.researchBrief = await Plan({ prompt });
      await saveResearch(output);

      updateStatus("Writing queries");
      const queriesResult = await WriteQueries({
        researchBrief: output.researchBrief,
      });
      output.queries = queriesResult.queries;
      gensx.publishObject("queries", output.queries);
      await saveResearch(output);

      updateStatus("Searching");
      // Execute queries, rank with Cohere, dedupe, and fetch content
      output.searchResults = await ExecuteQueries({
        prompt,
        queries: output.queries,
      });

      gensx.publishObject<SearchResult[]>(
        "searchResults",
        output.searchResults,
      );

      // Scrape content for the ranked results
      updateStatus("Reading");
      output.searchResults = await Promise.all(
        output.searchResults.map(
          async (document): Promise<SearchResult | null> => {
            try {
              // Scrape the content for each document
              const content = await Scrape({ url: document.url });

              // Return the document with content
              return {
                ...document,
                content,
              } as SearchResult;
            } catch (error) {
              console.error(
                `Error processing document ${document.url}:`,
                error,
              );
              return null;
            }
          },
        ),
      );

      gensx.publishObject<SearchResult[]>(
        "searchResults",
        output.searchResults,
      );
      await saveResearch(output);

      // Generate a report (the component streams the report to the client)
      updateStatus("Generating");
      output.report = await GenerateReport({
        prompt,
        researchBrief: output.researchBrief,
        documents: output.searchResults,
      });
      await saveResearch(output);
      updateStatus("Completed");

      return output;
    } catch (error) {
      console.error("Error in deep research:", error);
      return {
        report: "",
        searchResults: [],
      };
    }
  },
);
