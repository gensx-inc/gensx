import * as gensx from "@gensx/core";
import { QueryResult, SearchResult } from "../types";
import { Scrape } from "./scrape";
import { Summarize } from "./summarize";
import { cleanContent } from "../utils";
import { ExtractSnippet } from "./extract-snippets";

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
    // Create initial state with all documents stubbed out (no content/snippets yet)
    const sharedResults: QueryResult[] = queryResults.map((qr) => ({
      ...qr,
      results: qr.results.map((doc) => ({
        ...doc,
        content: undefined,
        snippet: undefined,
      })),
    }));

    // Send initial update with stubbed documents
    if (updateStep) {
      await updateStep(sharedResults);
    }

    const processedQueryResults = await Promise.all(
      queryResults.map(async (queryResult: QueryResult, queryIndex: number) => {
        const processedResults = await Promise.all(
          queryResult.results.map(
            async (
              document: SearchResult,
              docIndex: number,
            ): Promise<SearchResult | null> => {
              try {
                // Scrape the content for each document
                const content = await Scrape({ url: document.url });
                const cleanedContent = cleanContent(content);
                const snippet = await ExtractSnippet({
                  researchBrief,
                  query: queryResult.query,
                  content: cleanedContent,
                });

                const extractiveSummary = await Summarize({
                  researchBrief,
                  query: queryResult.query,
                  content: cleanedContent,
                });

                // Create the processed document
                const processedDocument = {
                  ...document,
                  content: extractiveSummary,
                  snippet:
                    snippet !== "No useful snippets found."
                      ? snippet
                      : undefined,
                } as SearchResult;

                // Update the specific document in shared state
                sharedResults[queryIndex].results[docIndex] = processedDocument;

                // Publish immediate update if callback is provided
                if (updateStep) {
                  // Create a deep copy of current state for the update
                  const currentState = sharedResults.map((qr) => ({
                    ...qr,
                    results: [...qr.results],
                  }));
                  await updateStep(currentState);
                }

                return processedDocument;
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

    // Final update with all results
    if (updateStep) {
      await updateStep(processedQueryResults);
    }

    return processedQueryResults;
  },
);
