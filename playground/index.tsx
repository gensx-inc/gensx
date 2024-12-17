import { Collect } from "@/components/Collect";
import {
  executeJsxWorkflow,
  withWorkflowComponent,
  withWorkflowFunction,
} from "@/index";

// Pure workflow steps
const pureResearchBrainstorm = async ({ prompt }: { prompt: string }) => {
  console.log("🔍 Starting research for:", prompt);
  const topics = await Promise.resolve(["topic 1", "topic 2", "topic 3"]);
  return topics;
};

const pureWriter = async ({
  research,
  prompt,
}: {
  research: string;
  prompt: string;
}): Promise<string> => {
  console.log("✍️  Writing draft based on research");
  return await Promise.resolve(`**draft\n${research}\n${prompt}\n**end draft`);
};

const pureEditor = async ({ draft }: { draft: string }) => {
  console.log("✨ Polishing final draft");
  return await Promise.resolve(`edited result: ${draft}`);
};

// Wrapped workflow steps
const LLMResearchBrainstorm = withWorkflowFunction(pureResearchBrainstorm);
const LLMResearch = withWorkflowFunction(
  async ({ topic }: { topic: string }) => {
    console.log("📚 Researching topic:", topic);
    return await Promise.resolve(`research results for ${topic}`);
  },
);
const LLMWriter = withWorkflowFunction(pureWriter);
const LLMEditor = withWorkflowFunction(pureEditor);

// Research collection component
const ResearchCollection = withWorkflowComponent(
  ({ prompt }: { prompt: string }) => (
    <LLMResearchBrainstorm prompt={prompt}>
      {topics => (
        <Collect>
          {topics.map(topic => (
            <LLMResearch topic={topic} />
          ))}
        </Collect>
      )}
    </LLMResearchBrainstorm>
  ),
);

const BlogWritingWorkflow = withWorkflowComponent(
  ({ prompt }: { prompt: string }) => (
    <ResearchCollection prompt={prompt}>
      {research => {
        console.log("🧠 Research:", research, typeof research);
        return (
          <LLMWriter research={research.join("\n")} prompt={prompt}>
            {draft => <LLMEditor draft={draft} />}
          </LLMWriter>
        );
      }}
    </ResearchCollection>
  ),
);

async function main() {
  console.log("🚀 Starting blog writing workflow");
  // const comp = jsx(LLMResearch, {
  //   topic: "Write a blog post about the future of AI",
  // });
  const result = await executeJsxWorkflow(
    <LLMResearch topic="Write a blog post about the future of AI" />,
  );
  console.log("✅ Final result:", result);
}

await main();
