import * as gensx from "@gensx/core";
import { WriteQueries } from "./deep-research/write-queries";
import { Plan } from "./deep-research/plan";
import { SearchResult, DeepResearchStep } from "./types";
import { GenerateReport } from "./deep-research/generate-report";
import { useBlob } from "@gensx/storage";
import { ExecuteQueries } from "./deep-research/execute-queries";
import { Scrape } from "./deep-research/scrape";
import { Summarize } from "./deep-research/summarize";
import { cleanContent } from "./utils";

export interface DeepResearchParams {
  prompt: string;
  userId: string;
  threadId: string;
}

export interface DeepResearchOutput {
  prompt: string;
  steps: DeepResearchStep[];
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
        steps: [],
      };

      // Helper function to add a step and save
      const addStep = async (step: DeepResearchStep): Promise<void> => {
        output.steps.push(step);
        await saveResearch(output);
        gensx.publishObject("steps", output.steps);
      };

      // Helper function to update a step at a specific index
      const updateStep = async (
        index: number,
        step: DeepResearchStep,
      ): Promise<void> => {
        if (index >= 0 && index < output.steps.length) {
          output.steps[index] = step;
          await saveResearch(output);
          gensx.publishObject("steps", output.steps);
        }
      };

      const updateStatus = gensx.createObjectStream<string>("status");

      // Step 1: Plan
      updateStatus("Planning");

      // Create initial plan step
      await addStep({
        type: "plan",
        plan: "",
      });

      const researchBrief = await Plan({
        prompt,
        updateStep: (plan: string) => updateStep(0, { type: "plan", plan }),
      });

      // Step 2: Write initial queries
      updateStatus("Writing queries");

      // Create initial queries step
      await addStep({
        type: "write-queries",
        queries: [],
      });

      const queriesResult = await WriteQueries({
        researchBrief,
        updateStep: (queries: string[]) =>
          updateStep(1, { type: "write-queries", queries }),
      });

      // Step 3: Execute queries
      updateStatus("Searching");

      // Create initial search step
      await addStep({
        type: "execute-queries",
        searchResults: [],
      });

      let searchResults = await ExecuteQueries({
        prompt,
        queries: queriesResult.queries,
        updateStep: (searchResults: SearchResult[]) =>
          updateStep(2, { type: "execute-queries", searchResults }),
      });

      // Step 4: Scrape and summarize content
      updateStatus("Reading");
      const processedResults = await Promise.all(
        searchResults.map(async (document): Promise<SearchResult | null> => {
          try {
            // Scrape the content for each document
            const content = await Scrape({ url: document.url });
            const cleanedContent = cleanContent(content);
            const extractiveSummary = await Summarize({
              researchBrief,
              queries: queriesResult.queries,
              content: cleanedContent,
            });

            // Return the document with content
            return {
              ...document,
              content: extractiveSummary,
            } as SearchResult;
          } catch (error) {
            console.error(`Error processing document ${document.url}:`, error);
            return null;
          }
        }),
      );

      // Filter out null values
      searchResults = processedResults.filter(
        (result): result is SearchResult => result !== null,
      );

      // Update the search results step with final results
      await updateStep(2, {
        type: "execute-queries",
        searchResults,
      });

      // Step 5: Generate report
      updateStatus("Generating");

      // Create initial report step
      await addStep({
        type: "generate-report",
        report: "",
      });

      await GenerateReport({
        prompt,
        researchBrief,
        documents: searchResults,
        updateStep: (report: string) =>
          updateStep(3, { type: "generate-report", report }),
      });

      updateStatus("Completed");

      return output;
    } catch (error) {
      console.error("Error in deep research:", error);
      return {
        prompt,
        steps: [],
      };
    }
  },
);
