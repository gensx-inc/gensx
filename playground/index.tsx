import { Component, gensx } from "@/index";

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
const LLMResearchBrainstorm = Component(pureResearchBrainstorm);
const LLMResearch = Component(async ({ topic }: { topic: string }) => {
  console.log("📚 Researching topic:", topic);
  return await Promise.resolve(`research results for ${topic}`);
});
const LLMWriter = Component(pureWriter);
const LLMEditor = Component(pureEditor);
const WebResearcher = Component(async ({ prompt }: { prompt: string }) => {
  console.log("🌐 Researching web for:", prompt);
  const results = await Promise.resolve([
    "web result 1",
    "web result 2",
    "web result 3",
  ]);
  return results;
});

// When building a workflow out of components, there are two options:
// 1. Use the Component function to wrap it and specify the input and output types. This gets you a function with type safe inputs and outputs (if you just call it as a function).
// 2. Don't wrap it in the Component function, and do not specify the output type (see BlogWritingWorkflow below). You get a function that is the same type as the JSX.Element signature, so it has an unknown output type. If you try to specify the output type on the function signature, you get a type error (unknown is not assignable to X).
const ParallelResearch = Component<{ prompt: string }, [string[], string[]]>(
  ({ prompt }: { prompt: string }) => (
    <>
      <LLMResearchBrainstorm prompt={prompt}>
        {topics => (
          <>
            {topics.map(topic => (
              <LLMResearch topic={topic} />
            ))}
          </>
        )}
      </LLMResearchBrainstorm>
      <WebResearcher prompt={prompt} />
    </>
  ),
);

const BlogWritingWorkflow = async ({ prompt }: { prompt: string }) => (
  <ParallelResearch prompt={prompt}>
    {([catalogResearch, webResearch]) => {
      console.log("🧠 Research:", { catalogResearch, webResearch });
      return (
        <LLMWriter research={catalogResearch.join("\n")} prompt={prompt}>
          {draft => <LLMEditor draft={draft} />}
        </LLMWriter>
      );
    }}
  </ParallelResearch>
);

async function main() {
  console.log("🚀 Starting blog writing workflow");

  // Use the gensx function to execute the workflow and annotate with the output type.
  const result = await gensx<string>(
    <BlogWritingWorkflow prompt="Write a blog post about the future of AI" />,
  );

  // Or just call the workflow as a function, and cast to the output type.
  const result2 = (await (
    <BlogWritingWorkflow prompt="Write a blog post about using GenSX to 10x your productivity." />
  )) as string;

  // Still need to cast here, because we didn't use the Component helper to wrap the workflow.
  const result3 = (await BlogWritingWorkflow({
    prompt: "Write a blog post about the future of AI",
  })) as string;

  // Don't need to cast here, because we used the Component helper to wrap the workflow.
  const researchResult = await ParallelResearch({
    prompt: "Write a blog post about the future of AI",
  });
  console.log("✅ Final result:", { result, result2, result3, researchResult });
}

await main();
