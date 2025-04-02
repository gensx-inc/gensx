---
title: '"But where''s the graph?" — Why trees beat graphs for LLM workflows'
excerpt: "Trees are graphs too, and they're dramatically easier to reason about."
date: "2025-04-03T00:00:00.000Z"
coverImage: "/assets/blog/hello-world/cover.jpg"
author:
  name: Jeremy Moseley
  picture: "/assets/blog/authors/jeremy.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

Look, I get it. When you think "workflow orchestration," your mind immediately goes to boxes and arrows. Some fancy graph visualization that makes your project look like a NASA mission control diagram. It's what everyone does. It's the "serious" approach.

But I'm going to let you in on a little secret that transformed how we built GenSX: **trees are graphs too**, and they're dramatically easier to reason about.

## The graph trap

I used to be that developer drawing elaborate workflow diagrams on whiteboards. Building complex orchestration pipelines with explicit nodes and edges. You know, the kind that looks like this:

```tsx
const graph = new Graph()
  .addNode("fetchHNPosts", fetchHNPosts)
  .addNode("analyzeHNPosts", analyzePosts)
  .addNode("generateReport", generateReport)
  .addNode("editReport", editReport)
  .addNode("writeTweet", writeTweet);

graph
  .addEdge(START, "fetchHNPosts")
  .addEdge("fetchHNPosts", "analyzeHNPosts")
  .addEdge("analyzeHNPosts", "generateReport")
  .addEdge("generateReport", "editReport")
  .addEdge("editReport", "writeTweet")
  .addEdge("writeTweet", END);
```

The problem? These graph structures force you to juggle multiple mental models simultaneously. You've got the node definitions in one place, edge connections somewhere else, a separate execution flow to consider, and usually a global state object being passed around. And that's before we even get to complex patterns like branching, conditional execution, or—heaven forbid—loops.

## Trees just make more sense

When we built GenSX, we made a radical bet: what if we used JSX to represent workflows as trees instead? Not because we're React fanboys (though some of us might be), but because tree structures match how humans naturally think about processes.

Here's that same workflow in GenSX:

```tsx
<FetchHNPosts limit={postCount}>
  {(stories) => (
    <AnalyzeHNPosts stories={stories}>
      {({ analyses }) => (
        <GenerateReport analyses={analyses}>
          {(report) => (
            <EditReport content={report}>
              {(editedReport) => (
                <WriteTweet
                  context={editedReport}
                  prompt="Summarize the HN trends in a tweet"
                />
              )}
            </EditReport>
          )}
        </GenerateReport>
      )}
    </AnalyzeHNPosts>
  )}
</FetchHNPosts>
```

"But wait," I can hear you protesting, "where's the graph?!"

It's right there. A tree is just a particular kind of graph—one where each node has exactly one parent. And that constraint buys us immense clarity without sacrificing power.

## When trees aren't enough, use JavaScript

Trees work beautifully for most linear workflows. But what about loops, conditionals, and cycles? Those places where traditional graphs flex their muscles?

Here's where GenSX's approach really shines. Instead of inventing some custom DSL for these patterns, we use... wait for it... regular JavaScript!

Need to implement an agent that loops until a condition is met? Easy:

```tsx
const AgentWorkflow = gensx.Component<{}, AgentWorkflowOutput>(
  "AgentWorkflow",
  () => {
    let result = null;
    while (!result.done) {
      result = AgentStep.run(result);
    }
    return result;
  },
);
```

Want to conditionally branch your workflow? Use a ternary operator!

```tsx
<DataFetcher url={apiUrl}>
  {(data) =>
    data.status === "success" ? (
      <ProcessSuccess data={data} />
    ) : (
      <HandleError error={data.error} />
    )
  }
</DataFetcher>
```

## Why it matters

After building dozens of LLM applications, I've found this approach delivers massive benefits in day-to-day development. The workflow reads top-to-bottom like normal code, with no mental juggling required. You're not constantly context-switching between graph definition and execution flow models.

Refactoring becomes vastly simpler when dependencies are explicit and components are reusable. We've all been there—trying to modify one part of a complex workflow only to discover hidden dependencies that break something seemingly unrelated. With GenSX's tree approach, those dependencies are right there in the code.

Our team's velocity dramatically increased when we switched to this model. Building reusable components feels natural, not forced. You're writing code the way you'd write any other TypeScript application, using patterns you already know.

## Your graph is still there (just simpler)

Look, I'm not anti-graph. I'm anti-unnecessary complexity. GenSX still represents your workflow as a directed graph internally. We just give you a more intuitive interface for expressing it.

In tree form, data dependencies between steps are crystal clear. Each child component only sees the output of its parent through explicit props or child functions. This explicitness means no mysterious global state, no tangled webs of dependencies, and no edge spaghetti that makes you question your career choices at 2 AM.

## The tree advantage

Trees aren't just simpler to read—they're also easier to test, debug, and reason about. Isolation is built-in because each component is a pure function of its inputs. Testing flows naturally since you can evaluate components independently. Debugging becomes straightforward because the call stack directly represents your workflow structure.

And the kicker? Functional components can be published and shared on npm, creating an ecosystem of reusable workflow patterns. Try doing that with a framework dependent on global state and proprietary graph syntax.

## But what about...?

Every time I present this approach, someone inevitably asks: "But what about [complex pattern X]? Surely you need a graph for that!"

In practice, we've found that the vast majority of workflows are simple linear chains—perfect for trees. A smaller percentage need basic branching, which is trivial with JS conditionals. And those complex patterns like cycles? They're handled elegantly through components and natural JS control flow like loops and conditionals.

From simple RAG pipelines to complex agentic systems, we've yet to encounter a pattern that this model can't handle with grace. The rare edge cases where traditional graphs might shine are easily addressed with standard programming language features.

## Embrace the tree

Next time you're designing a workflow system, resist the urge to reach for the graph API first. Ask yourself: could this be expressed as a tree? Could standard programming language features handle the more complex patterns?

Your future self—trying to understand that workflow six months from now—will thank you. Your teammates who need to maintain your code will buy you coffee. And your production systems will be more robust for it.

And maybe give [GenSX](https://app.gensx.com) a try. We've bet our workflow model on trees, and we haven't looked back.

Because sometimes, the best graph is the one you don't have to think about.
