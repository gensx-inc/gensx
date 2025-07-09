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
        status: "pending" as const,
      })),
    }));

    // Send initial update with stubbed documents
    if (updateStep) {
      await updateStep(sharedResults);
    }

    // Global debouncing for all updates
    let updateTimeout: NodeJS.Timeout | undefined;
    const sendUpdate = () => {
      if (updateStep) {
        // Clear any pending update
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }

        // Debounce the update call by 100ms
        updateTimeout = setTimeout(() => {
          const currentState = sharedResults.map((qr) => ({
            ...qr,
            results: [...qr.results],
          }));
          updateStep(currentState);
        }, 100);
      }
    };

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

                // Start both operations in parallel
                const snippetPromise = ExtractSnippet({
                  researchBrief,
                  query: queryResult.query,
                  content: cleanedContent,
                });

                const summaryPromise = Summarize({
                  researchBrief,
                  query: queryResult.query,
                  content: cleanedContent,
                });

                // Update when snippet completes
                snippetPromise.then((snippet) => {
                  const processedSnippet =
                    snippet !== "No useful snippets found."
                      ? snippet
                      : undefined;
                  sharedResults[queryIndex].results[docIndex] = {
                    ...sharedResults[queryIndex].results[docIndex],
                    snippet: processedSnippet,
                  };
                  sendUpdate();
                });

                // Update when summary completes
                summaryPromise.then((extractiveSummary) => {
                  const processedSummary = !extractiveSummary.includes(
                    "No relevant content",
                  )
                    ? extractiveSummary
                    : undefined;
                  sharedResults[queryIndex].results[docIndex] = {
                    ...sharedResults[queryIndex].results[docIndex],
                    content: processedSummary,
                  };
                  sendUpdate();
                });

                // Wait for both to complete before proceeding
                const [snippet, extractiveSummary] = await Promise.all([
                  snippetPromise,
                  summaryPromise,
                ]);

                // Create the final processed document (though it's already updated in shared state)
                const processedDocument = {
                  ...document,
                  content: !extractiveSummary.includes("No relevant content")
                    ? extractiveSummary
                    : undefined,
                  snippet:
                    snippet !== "No useful snippets found."
                      ? snippet
                      : undefined,
                  status: "completed" as const,
                } as SearchResult;

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

    // Clean up any pending debounced update
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }

    // Final update with all results
    if (updateStep) {
      await updateStep(processedQueryResults);
    }

    return processedQueryResults;
  },
);
