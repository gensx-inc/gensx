import * as gensx from "@gensx/core";
import { Plan } from "./deep-research/plan";
import { Search } from "./deep-research/search";
import { SearchResult } from "./types";
import { GenerateReport } from "./deep-research/generate-report";
import { useBlob } from "@gensx/storage";
import { GatherSources } from "./deep-research/gather-sources";

export interface DeepResearchParams {
  prompt: string;
  userId: string;
  threadId: string;
}

interface DeepResearchPlan {
  queries: string[];
  researchBrief: string;
}

export interface DeepResearchOutput {
  report: string;
  prompt: string;
  plan: DeepResearchPlan;
  searchResults: SearchResult[];
  processedSources: SearchResult[];
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
        plan: {
          queries: [],
          researchBrief: "",
        },
        searchResults: [],
        processedSources: [],
      };

      const updateStatus = gensx.createObjectStream<string>("status");
      updateStatus("Planning");
      output.plan = await Plan({ prompt });
      gensx.publishObject("queries", output.plan.queries);
      await saveResearch(output);

      updateStatus("Searching");
      // Execute all search queries in parallel
      const searchPromises = output.plan.queries.map((query) =>
        Search({ query, limit: 10 }),
      );
      const allSearchResults = await Promise.all(searchPromises);

      // Combine all search results
      const research = allSearchResults.flat();
      // Deduplicate research results
      output.searchResults = research.filter(
        (result, index, self) =>
          index === self.findIndex((t) => t.url === result.url),
      );
      gensx.publishObject<SearchResult[]>(
        "searchResults",
        output.searchResults,
      );
      await saveResearch(output);

      updateStatus("Processing");
      // Grade and scrape useful sources
      const processedSources = await GatherSources({
        prompt,
        searchResults: output.searchResults,
      });

      // Update search results with processed sources
      output.processedSources = processedSources;
      gensx.publishObject<SearchResult[]>("processedSources", processedSources);
      await saveResearch(output);

      // Generate a report (the component streams the report to the client)
      updateStatus("Generating");
      output.report = await GenerateReport({
        prompt,
        documents: processedSources,
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
