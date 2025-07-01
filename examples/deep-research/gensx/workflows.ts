import * as gensx from "@gensx/core";
import { Plan } from "./deep-research/plan";
import { Search } from "./deep-research/search";
import { SearchResult } from "./types";
import { GenerateReport } from "./deep-research/generate-report";

interface DeepResearchAgent {
  prompt: string;
  userId: string;
  threadId: string;
}

interface UserPlanDecision extends Record<string, unknown> {
  action: "continue" | "refine";
  refinementRequest?: string;
}

export const DeepResearch = gensx.Workflow(
  "DeepResearch",
  async ({ prompt }: DeepResearchAgent) => {
    try {
      const updateStatus = gensx.createObjectStream<string>("status");
      updateStatus("Planning");
      const plan = await Plan({ prompt });
      gensx.publishObject("queries", plan.queries);

      // Ask user if they want to refine the plan or continue
      updateStatus("Awaiting user decision");
      const userDecision = await gensx.requestInput<UserPlanDecision>(
        async (callbackUrl) => {
          // Publish the callback URL and plan details for the UI to use
          gensx.publishObject("planApproval", {
            callbackUrl,
            plan: plan.queries,
            message:
              "Would you like to refine this search plan or continue with the research?",
          });
        },
      );

      let finalQueries = plan.queries;

      // If user wants to refine, generate a new plan
      if (userDecision.action === "refine") {
        updateStatus("Refining plan");
        const refinedPlan = await Plan({
          prompt: `${prompt}\n\nUser refinement request: ${userDecision.refinementRequest}`,
        });
        finalQueries = refinedPlan.queries;
        gensx.publishObject("queries", finalQueries);
      }

      updateStatus("Searching");
      // Execute all search queries in parallel
      const searchPromises = finalQueries.map((query) =>
        Search({ query, limit: 20 }),
      );
      const allSearchResults = await Promise.all(searchPromises);

      // Combine all search results
      let research = allSearchResults.flat();
      // Deduplicate research results
      research = research.filter(
        (result, index, self) =>
          index === self.findIndex((t) => t.url === result.url),
      );
      gensx.publishObject<SearchResult[]>("searchResults", research);

      // Generate a report (the component streams the report to the client)
      updateStatus("Generating");
      const report = await GenerateReport({
        prompt,
        documents: research,
      });
      updateStatus("Completed");

      return report;
    } catch (error) {
      console.error("Error in chat processing:", error);
      return "";
    }
  },
);
