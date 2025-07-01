import { useCallback, useState } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { JsonValue } from "@gensx/core";

interface DeepResearchInput {
  prompt: string;
  userId: string;
  threadId: string;
}

interface DeepResearchOutput {
  report: string;
  prompt: string;
  plan: {
    queries: string[];
  };
  searchResults: JsonValue[];
}

interface UseChatReturn {
  runWorkflow: (
    prompt: string,
    userId: string,
    threadId: string,
  ) => Promise<void>;
  queries: string[] | undefined;
  searchResults: JsonValue | undefined;
  report: string | undefined;
  status: string | undefined;
  error: string | null;
  loadResearch: (threadId: string, userId: string) => Promise<void>;
  clear: () => void;
}

export function useDeepResearch(): UseChatReturn {
  const [savedData, setSavedData] = useState<DeepResearchOutput | null>(null);

  // Use the workflow hook
  const {
    error: workflowError,
    execution,
    run,
  } = useWorkflow<DeepResearchInput, DeepResearchOutput>({
    config: {
      baseUrl: "/api/gensx/DeepResearch",
    },
  });

  // Get real-time updates from the workflow
  const workflowQueries = useObject<string[]>(execution, "queries");
  const workflowSearchResults = useObject<JsonValue>(
    execution,
    "searchResults",
  );
  const workflowReport = useObject<string>(execution, "report");
  const workflowStatus = useObject<string>(execution, "status");

  // Use workflow data if available, otherwise fall back to saved data
  const queries = workflowQueries || savedData?.plan?.queries;
  const searchResults = workflowSearchResults || savedData?.searchResults;
  const report = workflowReport || savedData?.report;
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
    } catch (err) {
      console.error("Error loading research data:", err);
      setSavedData(null);
    }
  }, []);

  const clear = useCallback(() => {
    setSavedData(null);
  }, []);

  const runWorkflow = useCallback(
    async (prompt: string, userId: string, threadId: string) => {
      if (!prompt) return;

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
    status,
    error: workflowError,
    queries,
    searchResults,
    report,
    loadResearch,
    clear,
  };
}
