# GenSX: Why React is Actually the Best Model for Building LLM Apps

Why is building an LLM app or agent so damn hard?

_What if building an agent was as easy as writing a React component?_

Last week we open sourced GenSX, a framework for building agents and workflows with React-like components. It's a node.js framework for production-grade AI applications with uni-directional dataflow and no concept of "re-rendering".

## The Problem: Building LLM Apps Today Still Sucks

If you've tried to build anything beyond a simple chat interface with LLMs, you know the pain. The current ecosystem is a mess:

1. **Everything is Python-first**. JavaScript and TypeScript are eating the world, powering frontends and backends alike. And yet when it comes to building AI and agents, frameworks are stuck in an overabstracted, global-state Python world. No JavaScript or TypeScript to be found, no concept of declarative, repeatable components.

2. **Current workflow abstractions are wrong**. The popular frameworks force you into static graph definitions that are impossible to reason about. I've spent countless hours with a whiteboard trying to understand what my own code is doing.

3. **Global state is a nightmare**. Backend devs have created these crazy rube goldberg machines where you have to forward all of the state to all parts of the workflow. This doesn't work when you're trying to experiment with your agent.

I'm not alone in this frustration. The "no framework" movement is gaining steam, with developers abandoning LangChain and other frameworks in droves. Just check out [this HN thread](https://news.ycombinator.com/item?id=36211879) where developers share their frustrations with the current state of LLM frameworks.

GenSX is actually an accidental pivot. The team and I spent the first nine months building Cortex Click, a tool for automating developer marketing workflows with many happy paying customers. We shipped dozens of agent workflows to production. Many of these were complicated, running for five-plus minutes and making thousands of LLM calls.

We used one of the "hot" frameworks to do this, and grew increasingly frustrated with a few things:

1. Graph builder DSLs are extremely hard to reason about - reading the code is useless, and I always needed a whiteboard to figure out what my code was doing.
2. The framework depended on global state being passed around the graph.
3. The static nature of the graph made it hard to experiment with our workflows.
4. Everything felt like a python port, not something native and idiomatic to the node ecosystem.

These are not academic concerns. Our workflows edited content in multiple phases - removing buzz words, adding strong hooks to engage readers, stylometrics, linting and validating code, etc. As we layered in new steps we found that some of the work from previous steps would end up regressing. Some of these goals conflicted.

We were left with an optimization problem: in a workflow consisting of N steps, what order of execution maximizes your evals? Because of static graphs and intertwined global state, each permutation involved 10+ minutes of editing boilerplate. Not sustainable.

I rage-quit and went looking for other frameworks. To my dismay, all of them share the same fundamental programming model and flaws!

What started as a detour over Thanksgiving to solve our own problems resulted in GenSX.

## The Counterintuitive Solution: React

I know. I would not have guessed a React-like model would be good or maintainable for the backend. But I was wrong. The Frontend universe runs on this stuff and if you spend any amount of time with it I think you will not be able to imagine life without it.

Here's why React is, unintuitively, the best programming model for describing dataflow:

### 1. Encapsulation and Modularity

React enables developers to reuse components, decouple the "what" from the "how", and cleanly encapsulate shared context like themes, logging, and tracing.

Modern frontend projects split concerns between the display layer and actually fetching the data – referred to as "frontend for backend". This split allows one team to focus on querying the data efficiently, and the other decides what to do with it.

The same pattern applied to workflow provides clean separation of concerns via a clearly defined and easy to understand contract. Each component (or workflow step) encapsulates its logic and only exposes structured inputs and outputs.

This is inherently more controlled than scattering global state across your pipeline. And _by default_ your components and workflow steps are reusable across your codebase and easy to test in isolation.

### 2. Composition Over Abstraction

With GenSX, components can be composed together via React-style children functions that make data dependencies explicit, and shows the entirety of the data pipeline at a glance.

This model is much more consistent with the way we know that abstraction works in the frontend. Compose building blocks together, and share dependencies via context.

It allows infra teams to break out their surface area into the right, meaningful abstraction. Exactly what the consumer needs, nothing more, nothing less.

### 3. The Perfect Mix of Declarative and Dynamic

If you're a python developer you probably remember the battle between TensorFlow and PyTorch. TensorFlow was first to the scene, wildly popular and broadly adopted. But there was a major limitation - the DAG was defined statically upfront.

PyTorch changed this by letting developers build their DAGs dynamically as the program executed. This approach was so much more expressive that it dethroned TensorFlow, and the developers of the project scrambled to incorporate it into TensorFlow v2.

All of the current agent frameworks are modeled after TensorFlow and left me longing for the dynamic PyTorch version.

The React-model gives you the best of both worlds. JSX goes beyond defining the DOM and expressing trees. Since you can programmatically render elements, you've basically got an engine to build and execute a dynamic DAG.

This means you can express all of the same non-deterministic agent patterns like cycles and reflection. Easy to read declarative meets expressive and dynamic.

## A Tour of GenSX

If you know how to write a React component, you can build an agent:

```tsx
import { gsx } from "gensx";
import { ChatCompletion } from "gensx/openai";

interface WriteDraftProps {
  research: string[];
  prompt: string;
}

const WriteDraft = gsx.Component<WriteDraftProps, string>(
  "WriteDraft",
  ({ prompt, research }) => {
    const systemMessage = `You're an expert technical writer.
Use the information when responding to users: ${research}`;

    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: `Write a blog post about ${prompt}`,
          },
        ]}
      />
    );
  },
);
```

Components are just functions, and can be called as plain functions where it makes sense. They are reusable by default, shareable across your codebase, and can even be published to NPM and shared with the ecosystem.

When building GenSX workflows and agents, dependencies are clear, and the code reads cleanly top to bottom, with minimal boilerplate.

This is done with the use of child functions that cascade inputs and outputs down through a set of components:

```tsx
interface BlogWriterProps {
  prompt: string;
}

export const WriteBlog = gsx.StreamComponent<BlogWriterProps>(
  "WriteBlog",
  ({ prompt }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <Research prompt={prompt}>
          {(research) => (
            <WriteDraft prompt={prompt} research={research.flat()}>
              {(draft) => <EditDraft draft={draft} stream={true} />}
            </WriteDraft>
          )}
        </Research>
      </OpenAIProvider>
    );
  },
);

const workflow = gsx.Workflow("WriteBlogWorkflow", WriteBlog);
const result = await workflow.run({
  prompt: "Write a blog post about AI developer tools",
});
```

Contrast this with the current generation of agent frameworks that depend on graph-building APIs and global state:

```ts
const graph = new Graph()
  .addNode("hnCollector", collectHNStories)
  .addNode("analyzeHNPosts", analyzePosts)
  .addNode("trendAnalyzer", analyzeTrends)
  .addNode("pgEditor", editAsPG)
  .addNode("pgTweetWriter", writeTweet);

graph
  .addEdge(START, "hnCollector")
  .addEdge("hnCollector", "analyzeHNPosts")
  .addEdge("analyzeHNPosts", "trendAnalyzer")
  .addEdge("trendAnalyzer", "pgEditor")
  .addEdge("pgEditor", "pgTweetWriter")
  .addEdge("pgTweetWriter", END);
```

Can you tell what this code does at a glance? Personally, I need five minutes and a white board. And even after that point, there is a mess of hidden global state that needs to be traced. Want to refactor your workflow or add a new pipeline step? Be prepared to spend 20 minutes reworking the way that global state is defined and accumulated.

Consider this GenSX component that takes a list of hacker news stories and produces an LLM-generated summary and sentiment analysis over each one:

```tsx
const AnalyzeHNPosts = gsx.Component<AnalyzeHNPostsProps, AnalyzeHNPostsOutput>(
  "AnalyzeHNPosts",
  ({ stories }) => {
    return {
      analyses: stories.map((story) => ({
        summary: <SummarizePost story={story} />,
        commentAnalysis: <AnalyzeComments comments={story.comments} />,
      })),
    };
  },
);
```

The code reads cleanly from top to bottom, uses a mixture of declarative components and plain ole javascript for loops. Just a couple of lines and we're executing thousands of LLM calls - with the framework parallelizing work, handling retries, and even tracing and caching where appropriate.

## JavaScript Will Continue to Eat the World

My biggest disappointment in the LLM ecosystem today is a lack of open source community. There are plenty of frameworks, but very few useful blocks ready to drop into your application. I can't `npm install` something like a high-quality, LLM-driven sentiment analyzer complete with robust evals and maintained by a random developer in Montana. The only community to speak of is people publishing the latest prompt hacks on Reddit.

What a shame.

There are many reasons this is true, but clunky frameworks that depend on global state don't help.

And there is something about the culture of JavaScript and the npm ecosystem that python and pip seem to lack.

There are dozens of react component libraries over 1000 stars, and even [a package focused on nothing other than buttons](https://github.com/rcaferati/react-awesome-button)! This community loves to build and share.

Traditional ML is done in python. But LLMs have opened up the playing field. AI is more accessible than ever, and building delightful products has more to do with taste and elbow grease than PhD-level math.

Within a few years, node.js developers will be the largest consumers of AI tools, and the largest ecosystem to boot. Time to build the tools we need to get there.

## Try GenSX Today

I think you'll find GenSX to be a fresh but familiar take on building agents. It's open source and available under the Apache 2.0 license.

After using the existing tools, I understand how we arrived at the "no framework" movement. But truthfully we're all still searching for "the right framework". Something expressive and free of bloated abstractions that will inevitably turn out to be wrong when the next wave of LLM developments play out over the next six months. Not just a framework, but the developer tooling and ecosystem that comes with it.

GenSX is grounded in a lifelong love of the JavaScript ecosystem and years of frustration building and shipping complex agents to production.

Check out the project on GitHub and get started today. Happy building!
