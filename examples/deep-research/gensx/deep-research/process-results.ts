import * as gensx from "@gensx/core";
import { QueryResult, SearchResult } from "../types";
import { Scrape } from "./scrape";
import { Summarize } from "./summarize";
import { cleanContent } from "../utils";

interface ProcessResultsInput {
  researchBrief: string;
  queryResults: QueryResult[];
  updateStep?: (queryResults: QueryResult[]) => void | Promise<void>;
}

export const ProcessResults = gensx.Component(
  "ProcessResults",
  async ({
    researchBrief,
    queryResults,
    updateStep,
  }: ProcessResultsInput): Promise<QueryResult[]> => {
    const processedQueryResults = await Promise.all(
      queryResults.map(async (queryResult: QueryResult) => {
        const processedResults = await Promise.all(
          queryResult.results.map(
            async (document: SearchResult): Promise<SearchResult | null> => {
              try {
                // Scrape the content for each document
                const content = await Scrape({ url: document.url });
                const cleanedContent = cleanContent(content);
                const extractiveSummary = await Summarize({
                  researchBrief,
                  query: queryResult.query,
                  content: cleanedContent,
                });

                // Return the document with content
                return {
                  ...document,
                  content: extractiveSummary,
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

        // Filter out null values for this query
        const validResults = processedResults.filter(
          (result: SearchResult | null): result is SearchResult =>
            result !== null,
        );

        return {
          ...queryResult,
          results: validResults,
        };
      }),
    );

    // Update the step if callback is provided
    if (updateStep) {
      await updateStep(processedQueryResults);
    }

    return processedQueryResults;
  },
);
