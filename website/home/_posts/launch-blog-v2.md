# GenSX: JavaScript is eating the LLM world

Why is building an agent so hard?

_What if building an agent was as easy as writing a React component?_

If you ask me (as a developer) what the biggest trends over the past 10 years have been, one I’d definitely mention is how JavaScript and TypeScript are eating the world. What used to be little language for website interactions is now the most popular programming language on the planet, powering frontends and backends alike. This, coupled with React philosophy, is the dominant programming paradigm right now…

…and yet when it comes to building AI and agents, which is probably the other biggest trend I’d talk about, frameworks are stuck in overabstracted, global-state Python world. No JavaScript or TypeScript to be found, no concept of declarative, repeatable components.

GenSX is a framework for building agents and workflows with React-like components.

And while it’s inspired by React, it’s a node.js framework for production-grade AI applications.

If you know how to write a React component, you can build an agent:

\`\`\`tsx
import { gsx } from 'gensx';
import { ChatCompletion } from 'gensx/openai';

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

Components are just functions, and can be called as plain functions where it makes sense. They are reusable by default, shareable across your codebase, and can even be published to NPM and shared with the ecosystem.

When building GenSX workflows and agents, dependencies are clear, and the code reads cleanly top to bottom, with minimal boilerplate.

This is done with the use of child functions that cascade inputs and outputs down through a set of components:

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

Easy to read, easy to write, and the right mix of declarative and dynamic.

# “React” as a workflow engine

GenSX shares many similarities with React, but it has a different programming model. It is a dataflow engine where components produce outputs \- there is no concept of “rerendering”.

When I give demos to developers with React backgrounds they instantly get it.

Agents and building workflows are fundamentally about building and executing graphs or DAGs (directed acyclic graphs). I’ve worked on several DAG engines in the past including many years building Pulumi. Trees and DOM are what naturally come to mind when thinking about react, but in reality it generalizes to DAGs as well.

The first question from a Python developer is “why would I want to build on top of XML?”

In my opinion, JSX is one of the most elegant models for this category of problem.

Why?

1\. Declarative code that is easy to read and navigate.
2\. The ability to define and execute nodes dynamically by dropping into plain old JS/TS.
3\. A familiar mental model for millions of developers.
4\. An interface that is easy to build tooling on top of that makes you more productive.

Consider this component that takes a list of hacker news stories and produces an LLM-generated summary and sentiment analysis over each one:

\`\`\`tsx
const AnalyzeHNPosts \= gsx.Component\<AnalyzeHNPostsProps, AnalyzeHNPostsOutput\>(
"AnalyzeHNPosts",
({ stories }) \=\> {
return {
analyses: stories.map((story) \=\> ({
summary: \<SummarizePost story={story} /\>,
commentAnalysis: \<AnalyzeComments comments={story.comments} /\>
})),
};
},
);
\`\`\`

The code reads cleanly from top to bottom, uses a mixture of declarative components and plain ole javascript for loops. Just a couple of lines and we’re executing thousands of LLM calls \- with the framework parallelizing work, handling retries, and even tracing and caching where appropriate.

# How did we get here?

If you’re a python developer you probably remember the battle between TensorFlow and PyTorch. TensorFlow was first to the scene, wildly popular and broadly adopted. But there was a major limitation \- the DAG was defined statically upfront.

PyTorch changed this by letting developers build their DAGs dynamically as the program executed. This approach was so much more expressive that it dethroned TensorFlow, and the developers of the project scrambled to incorporate it into TensorFlow v2.

All of the current agent frameworks are modeled after TensorFlow and left me longing for the dynamic PyTorch version.

GenSX is actually an accidental pivot. The team and I spent the first nine months building Cortex Click, a tool for automating developer marketing workflows with many happy paying customers. We shipped dozens of agent workflows to production. Many of these were complicated, running for five-plus minutes and making thousands of LLM calls.

We used one of the “hot” frameworks to do this, and grew increasingly frustrated with a few things:

1. Graph builder DSLs are extremely hard to reason about \- reading the code is useless, and I always needed a whiteboard to figure out what my code was doing.
2. The framework depended on global state being passed around the graph.
3. The static nature of the graph made it hard to experiment with our workflows.
4. Everything felt like a python port, not something native and idiomatic to the node ecosystem.

These are not academic concerns. Our workflows edited content in multiple phases \- removing buzz words, adding strong hooks to engage readers, stylometrics, linting and validating code, etc. As we layered in new steps we found that some of the work from previous steps would end up regressing. Some of these goals conflicted.

We were left with an optimization problem: in a workflow consisting of N steps, what order of execution maximizes your evals? Because of static graphs and intertwined global state, each permutation involved 10+ minutes of editing boilerplate. Not sustainable.

I rage-quit and went looking for other frameworks. To my dismay, all of them share the same fundamental programming model and flaws\!

What started as a detour over Thanksgiving to solve our own problems resulted in GenSX.

# Javascript will continue to eat the world

My biggest disappointment in the LLM ecosystem today is a lack of open source community. There are plenty of frameworks, but very few useful blocks ready to drop into your application. I can’t `npm install` something like a high-quality, LLM-driven sentiment analyzer complete with robust evals and maintained by a random developer in Montana. The only community to speak of is people publishing the latest prompt hacks on Reddit.

What a shame.

There are many reasons this is true, but clunky frameworks that depend on global state don’t help.

And there is something about the culture of JavaScript and the npm ecosystem that python and pip seem to lack.

There are dozens of react component libraries over 1000 stars, and even [a package focused on nothing other than buttons](https://github.com/rcaferati/react-awesome-button)\! This community loves to build and share.

Traditional ML is done in python. But LLMs have opened up the playing field. AI is more accessible than ever, and building delightful products has more to do with taste and elbow grease than PhD-level math.

Within a few years, node.js developers will be the largest consumers of AI tools, and the largest ecosystem to boot. Time to build the tools we need to get there.

# Try GenSX today

I think you’ll find GenSX to be a fresh but familiar take on building agents. It’s open source and available under the Apache 2.0 license.

After using the existing tools, I understand how we arrived at the “no framework” movement. But truthfully we’re all still searching for “the right framework”. Something expressive and free of bloated abstractions that will inevitably turn out to be wrong when the next wave of LLM developments play out over the next six months. Not just a framework, but the developer tooling and ecosystem that comes with it.

GenSX is grounded in a lifelong love of the JavaScript ecosystem and years of frustration building and shipping complex agents to production.

Check out the project on GitHub and get started today.
