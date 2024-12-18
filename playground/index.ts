import { Component } from "@/workflow/component";
import { gensx } from "@/workflow/execute";

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
}) => {
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

// Research collection component
const ResearchCollection = Component(
  async ({ prompt }: { prompt: string }) =>
    [
      await gensx(LLMResearchBrainstorm, { prompt }, async topics => {
        return await Promise.all(topics.map(topic => LLMResearch({ topic })));
      }),
      await WebResearcher({ prompt }),
    ] as [string[], string[]],
);

const BlogWritingWorkflow = Component(({ prompt }: { prompt: string }) => {
  return gensx(
    ResearchCollection,
    { prompt },
    ([catalogResearch, webResearch]) => {
      console.log("🧠 Research:", { catalogResearch, webResearch });
      return gensx(
        LLMWriter,
        { research: catalogResearch.join("\n"), prompt },
        (draft: string) => LLMEditor({ draft }),
      );
    },
  );
});

async function main() {
  console.log("🚀 Starting blog writing workflow");
  const result = await gensx(BlogWritingWorkflow, {
    prompt: "Write a blog post about the future of AI",
  });
  console.log("✅ Final result:", result);
}

await main();
