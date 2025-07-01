import { useCallback } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { JsonValue } from "@gensx/core";

interface DeepResearchInput {
  prompt: string;
  userId: string;
  threadId: string;
}

interface DeepResearchOutput {
  report: string;
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
  //clear: () => void;
}

export function useDeepResearch(): UseChatReturn {
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
  const queries = useObject<string[]>(execution, "queries");
  const searchResults = useObject<JsonValue>(execution, "searchResults");
  const report = useObject<string>(execution, "report");
  const status = useObject<string>(execution, "status");

  const runWorkflow = useCallback(
    async (prompt: string, userId: string, threadId: string) => {
      if (!prompt) return;

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
    //clear,
    queries,
    searchResults,
    report,
  };
}
