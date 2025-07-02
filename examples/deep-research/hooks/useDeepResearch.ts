import { useCallback, useState } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { DeepResearchOutput, DeepResearchParams } from "../gensx/workflows";
import { SearchResult } from "../gensx/types";

interface UseChatReturn {
  runWorkflow: (
    prompt: string,
    userId: string,
    threadId: string,
  ) => Promise<void>;
  queries: string[] | undefined;
  searchResults: SearchResult[] | undefined;
  report: string | undefined;
  researchBrief: string | undefined;
  prompt: string | undefined;
  status: string | undefined;
  error: string | null;
  loadResearch: (threadId: string, userId: string) => Promise<void>;
  clear: () => void;
}

export function useDeepResearch(): UseChatReturn {
  const [savedData, setSavedData] = useState<DeepResearchOutput | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | undefined>(
    undefined,
  );

  // Use the workflow hook
  const {
    error: workflowError,
    execution,
    run,
  } = useWorkflow<DeepResearchParams, DeepResearchOutput>({
    config: {
      baseUrl: "/api/gensx/DeepResearch",
    },
  });

  // Get real-time updates from the workflow
  const workflowQueries = useObject<string[]>(execution, "queries");
  const workflowSearchResults = useObject<SearchResult[]>(
    execution,
    "searchResults",
  );
  const workflowReport = useObject<string>(execution, "report");
  const workflowResearchBrief = useObject<string>(execution, "researchBrief");
  const workflowStatus = useObject<string>(execution, "status");

  // Determine if we have active workflow data
  const hasActiveWorkflow = workflowStatus && workflowStatus !== "Completed";

  // Use workflow data if we have an active workflow, otherwise use saved data
  const queries = hasActiveWorkflow
    ? workflowQueries
    : workflowQueries || savedData?.queries;
  const searchResults = hasActiveWorkflow
    ? workflowSearchResults
    : workflowSearchResults || savedData?.searchResults;
  const report = hasActiveWorkflow
    ? workflowReport
    : workflowReport || savedData?.report;
  const researchBrief = hasActiveWorkflow
    ? workflowResearchBrief
    : workflowResearchBrief || savedData?.researchBrief;
  const prompt = currentPrompt || savedData?.prompt;
  const status = workflowStatus;

  const loadResearch = useCallback(async (threadId: string, userId: string) => {
    if (!threadId || !userId) return;

    try {
      const response = await fetch(`/api/research/${userId}/${threadId}`);
      if (!response.ok) {
        throw new Error("Failed to load research data");
      }

      const data: DeepResearchOutput = await response.json();
      setSavedData(data);
      setCurrentPrompt(data.prompt); // Set current prompt from loaded data
    } catch (err) {
      console.error("Error loading research data:", err);
      setSavedData(null);
      setCurrentPrompt(undefined);
    }
  }, []);

  const clear = useCallback(() => {
    setSavedData(null);
    setCurrentPrompt(undefined);
  }, []);

  const runWorkflow = useCallback(
    async (prompt: string, userId: string, threadId: string) => {
      if (!prompt) return;

      // Set current prompt immediately so it shows up in UI
      setCurrentPrompt(prompt);

      // Clear saved data when starting new workflow
      setSavedData(null);

      // Run the workflow
      await run({
        inputs: {
          prompt: prompt,
          userId: userId,
          threadId: threadId,
        },
      });
    },
    [run],
  );

  return {
    runWorkflow,
    status: status ?? "Planning",
    error: workflowError,
    queries,
    searchResults,
    report,
    researchBrief,
    prompt,
    loadResearch,
    clear,
  };
}
