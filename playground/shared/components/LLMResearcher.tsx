import { createWorkflow } from "@/src/utils/workflowBuilder";

interface ResearcherProps {
  title: string;
  prompt: string;
}

interface ResearcherOutput {
  research: string;
  sources: string[];
  summary: string;
}

export const LLMResearcher = createWorkflow<ResearcherProps, ResearcherOutput>(
  async (props, { resolve }) => {
    const processedResearch = await Promise.resolve(
      `Research based on title: ${props.title}, prompt: ${props.prompt}`,
    );
    const processedSources = ["source1.com", "source2.com"];
    const processedSummary = "Brief summary of findings";

    return resolve({
      research: processedResearch,
      sources: processedSources,
      summary: processedSummary,
    });
  },
  "LLMResearcher",
);
