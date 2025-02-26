# Why React is actually the best model for backend workflows

Last week we open sourced GenSX, a framework for building agents and workflows with React-like components.

The programming model shares many similarities with React such as functional components, a mix of declarative elements and dynamic JavaScript to construct a DAG in memory, uni-directional dataflow, and context APIs for dependency injection. But it is very different \- a node.js framework for describing dataflow with no concept of “re-rendering”.

Unintuitively, React is the best programming model that we have for describing dataflow:

- React is a proven pattern for encapsulation and modularity
- React focusses on composition over abstraction
- React provides the best of declarative and dynamic

I know. I would not have guessed a React-like model would be good or maintainable for the backend. But I was wrong. The Frontend universe runs on this stuff and if you spend any amount of time with it I think you will not be able to imagine life without it, at least in React.

# Encapsulation and modularity

React enables frontend developers to reuse components, decouple the “what” from the “how”, and cleanly encapsulate shared context like themes, logging, and tracing.

Modern frontend projects split concerns between the display layer and actually fetching the data – referred to as “frontend for backend”. This split allows one team to focus on querying the data efficiently, and the other decides what to do with it.

This is only possible because of the `Component` interface. When a UI engineer needs data they just call the hooks. In the design system they are given well defined attributes that have nothing to do with actually fetching the data.

The same pattern applied to workflow provides clean separation of concerns via a clearly defined and easy to understand contract. Writing a component in GenSX will feel familiar if you’ve ever worked with React:

\`\`\`tsx
interface WriteDraftProps {
research: string\[\];
prompt: string;
}

const WriteDraft \= gsx.Component\<WriteDraftProps, string\>(
"WriteDraft",
({ prompt, research }) \=\> {
const systemMessage \= \`You're an expert technical writer.
Use the information when responding to users: ${research}\`;

    return (
      \<ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={\[
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: \`Write a blog post about ${prompt}\`
          },
        \]}
      /\>
    );

},
);
\`\`\`

Each component (or workflow step) encapsulates its logic and only exposes structured inputs and outputs.

This is inherently more controlled than scattering global state across your pipeline. And _by default_ your components and workflow steps are reusable across your codebase and easy to test in isolation.

# Composition over abstraction

Backend devs have created these crazy rube goldberg machines where you have to forward all of the state to all parts of the workflow. This doesn’t work, and neither does abstraction.

You will need to experiment with your workflow \- continuously adding new steps and changing the order of the existing ones. Global state and abstraction kill your ability to do this, and makes it nearly impossible to just read the code and visualize dependencies.

With GenSX, components can be composed together via React-style children functions that make data dependencies explicit, and shows the entirety of the data pipeline at a glance.

\`\`\`tsx
interface BlogWriterProps {
prompt: string;
}

export const WriteBlog \= gsx.StreamComponent\<BlogWriterProps\>(
"WriteBlog",
({ prompt }) \=\> {
return (
\<OpenAIProvider apiKey={process.env.OPENAI_API_KEY}\>
\<Research prompt={prompt}\>
{(research) \=\> (
\<WriteDraft prompt={prompt} research={research.flat()}\>
{(draft) \=\> \<EditDraft draft={draft} stream={true} /\>}
\</WriteDraft\>
)}
\</Research\>
\</OpenAIProvider\>
);
},
);

const workflow \= gsx.Workflow("WriteBlogWorkflow", WriteBlog);
const result \= await workflow.run({
prompt: "Write a blog post about AI developer tools"
});
\`\`\`

This model is much more consistent with the way we know that abstraction works in the frontend. Compose building blocks together, and share dependencies via context.

It allows infra teams to break out their surface area into the right, meaningful abstraction. Exactly what the consumer needs, nothing more, nothing less.

Contrast this with the current generation of agent frameworks that depend on graph-building APIs and global state:

\`\`\`ts
const graph \= new Graph()
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
\`\`\`

Can you tell what this code does at a glance? Personally, I need five minutes and a white board. And even after that point, there is a mess of hidden global state that needs to be traced. Want to refactor your workflow or add a new pipeline step? Be prepared to spend 20 minutes reworking the way that global state is defined and accumulated.

# Declarative and dynamic

Every workflow engine is either a YAML DSL or it is entirely code and a complete black hole for static analysis. But we can in fact have a dynamic topology with real encapsulation.

The React-model gives you the best of both worlds. JSX goes beyond defining the DOM and expressing trees. Since you can programmatically render elements, you’ve basically got an engine to build and execute a dynamic DAG:

\`\`\`tsx
const AgentWorkflow \= gsx.Component(
"AgentWorkflow",
\<AgentStep\>
{(result) \=\>
result.needsMoreWork ? (
// Recursion creates AgentWorkflow \-\> AgentStep \-\> AgentWorkflow \-\> …
\<AgentWorkflow /\>
) : (
result
)
}
\</AgentStep\>
);
\`\`\`

This means you can express all of the same non-deterministic agent patterns like cycles and reflection. Easy to read declarative meets expressive and dynamic.

# React as a workflow engine

Somehow, the frontend devs are ahead of the backend. They’ve built a clean model that scales.

The same can be applied to backend teams. Separate how to get the data and what to do with it. Compose workflows together with building blocks. Get the best of declarative and dynamic.

The right model of abstraction matters even more in the context of AI given how quickly model capabilities and programming patterns are evolving. Zero abstraction means rebuilding the world from scratch, yet the wrong one results in getting stuck.

GenSX is open source under the Apache 2.0 license. While today it is optimized for agents and workflows that run for a few minutes, we have plans to extend it with durable execution for human-in-the-loop and long running workflows.

If you’re looking for a fresh take on agents and workflows, give GenSX a try. Happy building\!
