import * as gensx from "@gensx/core";
import { WriteQueries } from "./deep-research/write-queries";
import { Plan } from "./deep-research/plan";
import { DeepResearchStep, QueryResult } from "./types";
import { GenerateReport } from "./deep-research/generate-report";
import { useBlob } from "@gensx/storage";
import { ExecuteQuery } from "./deep-research/execute-queries";
import { ProcessResults } from "./deep-research/process-results";
import { Evaluate } from "./deep-research/evaluate";

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
        gensx.publishObject("steps", { steps: output.steps });
      };

      // Helper function to update a step at a specific index
      const updateStep = async (
        index: number,
        step: DeepResearchStep,
      ): Promise<void> => {
        if (index >= 0 && index < output.steps.length) {
          output.steps[index] = step;
          await saveResearch(output);
          gensx.publishObject("steps", { steps: output.steps });
        }
      };

      // Helper function to get the current step index
      const getCurrentStepIndex = (): number => {
        return output.steps.length - 1;
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
        updateStep: (plan: string) =>
          updateStep(getCurrentStepIndex(), { type: "plan", plan }),
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
          updateStep(getCurrentStepIndex(), { type: "write-queries", queries }),
      });

      // Step 3: Execute queries
      updateStatus("Searching");

      const queryResults = await ExecuteQuery({
        queries: queriesResult.queries,
        previousResults: [], // No previous results for initial search
        updateStep: async (queryResults: QueryResult[]) => {
          // If the last step is not "execute-queries", add it
          const steps = output.steps;
          if (
            !steps.length ||
            steps[steps.length - 1].type !== "execute-queries"
          ) {
            await addStep({
              type: "execute-queries",
              queryResults: [],
            });
          }
          await updateStep(getCurrentStepIndex(), {
            type: "execute-queries",
            queryResults,
          });
        },
      });

      // Step 4: Scrape and summarize content for each query result
      updateStatus("Reading");

      const processedQueryResults = await ProcessResults({
        researchBrief,
        queryResults,
        updateStep: (queryResults: QueryResult[]) =>
          updateStep(getCurrentStepIndex(), {
            type: "execute-queries",
            queryResults,
          }),
      });

      // Update the search results step with final results
      await updateStep(getCurrentStepIndex(), {
        type: "execute-queries",
        queryResults: processedQueryResults,
      });

      // Step 5: Reflect on the research
      updateStatus("Evaluating research");

      // Create initial reflection step
      await addStep({
        type: "evaluate",
        isSufficient: false,
        analysis: "",
        followUpQueries: [],
      });

      const reflection = await Evaluate({
        researchBrief,
        queryResults: processedQueryResults,
      });

      // Update reflection step with results
      await updateStep(getCurrentStepIndex(), {
        type: "evaluate",
        isSufficient: reflection.is_sufficient,
        analysis: reflection.analysis,
        followUpQueries: reflection.follow_up_queries,
      });

      // If research is not sufficient, do additional rounds
      let currentQueryResults = processedQueryResults;
      let round = 1;
      const maxRounds = 3; // Limit to prevent infinite loops

      while (!reflection.is_sufficient && round < maxRounds) {
        round++;
        updateStatus(`Searching`);

        // Execute follow-up queries
        const followUpQueryResults = await ExecuteQuery({
          queries: reflection.follow_up_queries,
          previousResults: currentQueryResults, // Pass all previous results to filter out duplicates
          updateStep: async (queryResults: QueryResult[]) => {
            // If the last step is not "execute-queries", add it
            const steps = output.steps;
            if (
              !steps.length ||
              steps[steps.length - 1].type !== "execute-queries"
            ) {
              await addStep({
                type: "execute-queries",
                queryResults: [],
              });
            }
            await updateStep(getCurrentStepIndex(), {
              type: "execute-queries",
              queryResults,
            });
          },
        });

        updateStatus(`Reading`);

        // Process the new results
        const processedFollowUpResults = await ProcessResults({
          researchBrief,
          queryResults: followUpQueryResults,
          updateStep: (queryResults: QueryResult[]) =>
            updateStep(getCurrentStepIndex(), {
              type: "execute-queries",
              queryResults: queryResults,
            }),
        });

        // Combine all results for the next reflection
        currentQueryResults = [
          ...currentQueryResults,
          ...processedFollowUpResults,
        ];

        // Update the search results step with only the new results
        await updateStep(getCurrentStepIndex(), {
          type: "execute-queries",
          queryResults: processedFollowUpResults,
        });

        if (round === maxRounds) {
          break;
        }

        updateStatus(`Evaluating research`);

        // Add new reflection step for this round
        await addStep({
          type: "evaluate",
          isSufficient: false,
          analysis: "",
          followUpQueries: [],
        });

        const newReflection = await Evaluate({
          researchBrief,
          queryResults: currentQueryResults,
        });

        // Update reflection step
        await updateStep(getCurrentStepIndex(), {
          type: "evaluate",
          isSufficient: newReflection.is_sufficient,
          analysis: newReflection.analysis,
          followUpQueries: newReflection.follow_up_queries,
        });

        // Update reflection variable for next iteration
        reflection.is_sufficient = newReflection.is_sufficient;
        reflection.follow_up_queries = newReflection.follow_up_queries;
      }

      // Step 6: Generate report
      updateStatus("Generating");

      // Create initial report step
      await addStep({
        type: "generate-report",
        report: "",
      });

      await GenerateReport({
        prompt,
        researchBrief,
        documents: currentQueryResults.flatMap((qr) => qr.results),
        updateStep: (report: string) =>
          updateStep(getCurrentStepIndex(), {
            type: "generate-report",
            report,
          }),
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
