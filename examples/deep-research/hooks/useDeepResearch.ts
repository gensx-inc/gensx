import { useCallback, useState, useMemo } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { DeepResearchOutput, DeepResearchParams } from "../gensx/workflows";
import { DeepResearchStep } from "../gensx/types";

interface UseChatReturn {
  runWorkflow: (
    prompt: string,
    userId: string,
    threadId: string,
  ) => Promise<void>;
  steps: DeepResearchStep[] | undefined;
  researchBrief: string | undefined;
  report: string | undefined;
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
  const workflowSteps = useObject<{ steps: DeepResearchStep[] }>(
    execution,
    "steps",
  );
  const workflowStatus = useObject<string>(execution, "status");

  // Get the current steps (prioritize saved data when available, otherwise use workflow)
  const steps = savedData?.steps || workflowSteps?.steps;

  // Extract only researchBrief and report for easy access
  const { researchBrief, report } = useMemo(() => {
    if (!steps) return { researchBrief: undefined, report: undefined };

    const planStep = steps.filter((step) => step.type === "plan").pop();
    const reportStep = steps
      .filter((step) => step.type === "generate-report")
      .pop();

    return {
      researchBrief: planStep?.type === "plan" ? planStep.plan : undefined,
      report:
        reportStep?.type === "generate-report" ? reportStep.report : undefined,
    };
  }, [steps]);

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
    status: savedData ? "Completed" : (status ?? "Planning"),
    error: workflowError,
    steps,
    researchBrief,
    report,
    prompt,
    loadResearch,
    clear,
  };
}
