<h1 align="center">&lt;GenSX /&gt;</h1>

<p align="center">
  Make LLMs work good
</p>

## LLM + JSX = ⚡️

GenSX is a library for building LLM workflows, using JSX for simple and fast development.

```jsx
import * as gsx from "gensx";

const title = "How to be a 10x LLM Developer";
const prompt = "Write an article about using gensx to build LLM applications";

const [tweet, blogPost] = await gsx.execute(
  <BlogWritingWorkflow title={title} prompt={prompt}>
    {blogPost => (
      <TweetWritingWorkflow content={blogPost}>
        {tweet => {
          return [tweet, blogPost];
        }}
      </TweetWritingWorkflow>
    )}
  </BlogWritingWorkflow>,
);
```

## 📦 Installing

```bash
pnpm install gensx
```

```bash
yarn add gensx
```

```bash
npm install gensx
```

## Building a workflow, the declarative way!

```jsx
import * as gsx from "gensx";

interface ResearchBrainstormProps {
  prompt: string;
}
type ResearchBrainstormOutput = string[];

// A component can be any normal function, async or not. Similar to a React component, but it needs to be wrapped in a call to gsx.Component.
const ResearchBrainstorm = gsx.Component<
  ResearchBrainstormProps,
  ResearchBrainstormOutput
>(async ({ prompt }) => {
  console.log("🔍 Starting research for:", prompt);
  const topics = await Promise.resolve(["topic 1", "topic 2", "topic 3"]);
  return topics;
});

interface PerformResearchProps {
  topic: string;
}
type PerformResearchOutput = string;
const PerformResearch = gsx.Component<ResearchProps, ResearchOutput>(
  async ({ topic }) => {
    console.log("📚 Researching topic:", topic);
    return await Promise.resolve(`research results for ${topic}`);
  },
);

interface WriteDraftProps {
  research: string;
  prompt: string;
}
type WriteDraftOutput = string;
const WriteDraft = gsx.Component<WriteDraftProps, WriteDraftOutput>(
  async ({ research, prompt }) => {
    console.log("✍️  Writing draft based on research");
    return await Promise.resolve(
      `**draft\n${research}\n${prompt}\n**end draft`,
    );
  },
);

interface EditDraftProps {
  draft: string;
}
type EditDraftOutput = string;
const EditDraft = gsx.Component<EditDraftProps, EditDraftOutput>(
  async ({ draft }) => {
    console.log("✨ Polishing final draft");
    return await Promise.resolve(`edited result: ${draft}`);
  },
);

interface WebResearcherProps {
  prompt: string;
}
type WebResearcherOutput = string[];
const WebResearcher = gsx.Component<WebResearcherProps, WebResearcherOutput>(
  async ({ prompt }) => {
    console.log("🌐 Researching web for:", prompt);
    const results = await Promise.resolve([
      "web result 1",
      "web result 2",
      "web result 3",
    ]);
    return results;
  },
);

type ParallelResearchOutput = [string[], string[]];
interface ParallelResearchComponentProps {
  prompt: string;
}

// You can build complex workflows by nesting components. When you pass a child function to a component, it will be called with the output of that component, and you can use that output inside any child components. If you don't specify a function as a child, the result from that leaf node will be bubbled up as the final result.
//
// We again wrap using the gsx.Component function, and we annotate the output type with the type of the final result.
const ParallelResearch = gsx.Component<
  ParallelResearchComponentProps,
  ParallelResearchOutput
>(({ prompt }) => (
  <>
    <ResearchBrainstorm prompt={prompt}>
      {topics => topics.map(topic => <PerformResearch topic={topic} />)}
    </ResearchBrainstorm>
    <WebResearcher prompt={prompt} />
  </>
));

interface BlogWritingWorkflowProps {
  prompt: string;
}
type BlogWritingWorkflowOutput = string;
const BlogWritingWorkflow = gsx.Component<
  BlogWritingWorkflowProps,
  BlogWritingWorkflowOutput
>(async ({ prompt }) => (
  <ParallelResearch prompt={prompt}>
    {([catalogResearch, webResearch]) => {
      console.log("🧠 Research:", { catalogResearch, webResearch });
      return (
        <WriteDraft
          research={[catalogResearch.join("\n"), webResearch.join("\n")].join(
            "\n\n",
          )}
          prompt={prompt}
        >
          {draft => <EditDraft draft={draft} />}
        </WriteDraft>
      );
    }}
  </ParallelResearch>
));

async function main() {
  console.log("🚀 Starting blog writing workflow");

  // Use the gensx function to execute the workflow and annotate with the output type.
  const result = await gsx.execute<BlogWritingWorkflowOutput>(
    <BlogWritingWorkflow prompt="Write a blog post about the future of AI" />,
  );
  console.log("✅ Final result:", { result });
}

await main();
```

## ⚙️ Developing the library

### 📦 Building

```bash
pnpm build
```

### 🧪 Testing

If you want to run the tests of the project, you can execute the following command:

```bash
pnpm test
```

### 💅 Linting

To run the linter you can execute:

```bash
pnpm lint
```

And for trying to fix lint issues automatically, you can run:

```bash
pnpm lint:fix
```
