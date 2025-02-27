---
title: "Self-modifying code"
excerpt: "Build an agent that can change its own code, start new instances of itself, self-replicate, and evolve."
date: "2025-02-27T00:00:00.000Z"
coverImage: "/assets/blog/hello-world/cover.jpg"
author:
  name: Evan Boyle
  picture: "/assets/blog/authors/evan.jpg"
ogImage:
  url: "/assets/blog/hello-world/cover.jpg"
---

I’ve always dreamed about self-modifying code. You know, this idea that an AI could change its own source code, run that modified code, self-replicate, and evolve.

Real sci-fi stuff, huh? Well, now that Claude 3.7 has been released, I decided to give it a try.

Will it develop independent thought? Brick my machine? Ascend to Skynet?

Feel free to [fork the example in the GenSX GitHub repo](https://github.com/gensx-inc/gensx/tree/main/examples/self-modifying-code) if you’d like to follow along. But fair warning that if you do decide to run this code, **make sure you do it in a VM**. It has the ability to run arbitrary bash commands and spawn new instances of itself in a loop. Each iteration consumes \~1MM tokens (\~$4 at the time of writing), so you certainly don’t want it to run away while unattended.

# Architecture

While this may sound daunting, the architecture is surprisingly straight forward. There is an outer control loop for cloning source code and spawning new agent processes, and an inner workflow that contains the LLM magic.

![Self-modifying code architecture](/assets/blog/self-modifying-code/architecture.png)

The agent works recursively through a sequence of steps:

1. Clone its own source code from a git branch
2. Read context and history of previous operations.
3. Decide on a goal state.
4. Modify its source code to match that goal state.
5. Verify the changes by building and running tests.
6. Push code changes and updated context to the git branch.
7. Shut itself down and spawn a new agent to take control (repeat).

Even if the agent fails to successfully make code changes, it will still push updated context to the git branch so that future versions can understand the attempt and failure, and take a new approach on the next iteration.

The inner LLM loop is a [GenSX workflow](/docs). There is an outer control loop in plain TypeScript that handles workspace setup and spawning new processes on completion, but the most interesting part is the inner workflow where all of the LLM logic is encapsulated:

```tsx
export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace }) => {
    return (
      <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
        <WorkspaceProvider workspace={workspace}>
          <GenerateGoalState>
            {() => (
              <GeneratePlan>
                {(plan) => (
                  <ModifyCode plan={plan}>
                    {(modifySuccess) => (
                      <RunFinalValidation success={modifySuccess}>
                        {(validated) => (
                          <CommitResults success={validated}>
                            {(committed) => ({
                              success: committed,
                              modified: true,
                            })}
                          </CommitResults>
                        )}
                      </RunFinalValidation>
                    )}
                  </ModifyCode>
                )}
              </GeneratePlan>
            )}
          </GenerateGoalState>
        </WorkspaceProvider>
      </AnthropicProvider>
    );
  },
);
```

This workflow is made of providers and components. Providers supply shared context like credentials for LLM calls and the workspace that contains the agent’s codebase. Components are independent, reusable workflow steps.

Agent state is stored in a agent_context.json file checked into the repo. It contains a goalState describing the last goal it decided upon and history[] which contains a log of all successful and unsuccessful operations for it to reflect on in future runs.

How does the agent decide what to do? It reads this goal state file, checks to see if the current goal has been achieved, and independently decides on a new goal.

From there we run steps to search the codebase and create a detailed plan for the work, run our coding agent against that plan, and finally validate and commit the results. If the agent fails its task, we only commit a summary to agent_context.json so the next iteration can try again with a different approach to the problem.

## Code Agent

So how do you programmatically edit a code base with an LLM? [Anthopic published an extensive blog post](https://www.anthropic.com/research/swe-bench-sonnet) on their process for optimizing Claude 3.5 for a set of software engineering-specific benchmarks called SWE-bench. The TLDR; is that a \~30 line prompt with access to two tool calls executes tools continuously until (a) the task is complete or (b) the context window is filled up and the LLM gives up.

We use this as a blueprint for our code agent, as word on the street is that most of the LLM coding agents follow roughly the same pattern, going as far as to use the exact same tool names that are used in the blog post and the post-training data set.

The first tool is for running arbitrary bash commands. Great for installing npm packages, or running tests:

```md
Run commands in a bash shell

- When invoking this tool, the contents of the "command" parameter does NOT need to be XML-escaped.
- You don't have access to the internet via this tool.
- You do have access to a mirror of common linux and python packages via apt and pip.
- State is persistent across command calls and discussions with the user.
- To inspect a particular line range of a file, e.g. lines 10-25, try 'sed -n 10,25p /path/to/the/file'.
- Please avoid commands that may produce a very large amount of output.
- Please run long lived commands in the background, e.g. 'sleep 10 &' or start a server in the background.
```

And the second tool is for creating, editing, and viewing files:

```md
Tool for viewing and editing files. Operations are atomic - edits replace the entire file content.

Commands:

- view: Read a file or list directory contents
  - For files: returns the complete file content
  - For directories: lists files and directories up to 2 levels deep
- create: Create a new file with the specified content
  - Will create parent directories if needed
  - Fails if file already exists
- write: Replace entire file content
  - Creates a backup before modification
  - Writes the new content atomically
  - this does not edit a file in place, it creates a new file with the updated content
  - Use this for all file modifications
```

There is a lot more to doing this reliably, and making sure that the LLM doesn’t do things like nuke the filesystem (again - _run this code at your own risk_), but this simplified gist will take us pretty far.

# So what did the agent do?

We let the agent come up with its own goals for improving itself. It reads through the context and history of changes and uses tools to access the codebase.

On the first run it decides it wants to statically analyze the typescript to build a graph of relationships across the codebase. Quite a tall order\!

![Agent planning](/assets/blog/self-modifying-code/plan.png)

Over the course of seven minutes, the code agent makes 60 tool calls reading the code base, installing packages from npm, and building to validate its changes:

![Agent calling tools](/assets/blog/self-modifying-code/agent-tools.png)

At first, the build errors are pages long. But they get shorter and shorter each iteration:

![Build failed](/assets/blog/self-modifying-code/build-failed.png)

After five iterations of failed builds and subsequent edits by the agent, the build is finally green:

![Build succeeded](/assets/blog/self-modifying-code/build-success.png)

I think people underestimate how powerful tools are. The agent is pretty bare bones and there is infinite opportunity for optimization. But even so, it was able to brute force its way through this in seven minutes.

It pushed a whopping 3200 lines of code to the branch, and it updated the GenSX workflow with a new step that runs tests in addition to the basic build validation:

![Agent pull request](/assets/blog/self-modifying-code/pr-summary.png)

But there are some problems. A deeper look at the code reveals a few TODO comments and stubbed out methods that aren’t even implemented.

![TODOs in the PR](/assets/blog/self-modifying-code/pr-todos.png)

I was hopeful that the agent would see all of the TODOs and NYIs when it planned for the next iteration and decide to finish the job. Unfortunately, it just moved on to implementing a telemetry and logging system.

# Should you worry about losing your job?

Based on my experience building this, absolutely not. At least not yet. This self modifying agent can’t really be left to its own devices.

It reminds me a lot of the median junior dev. To succeed it needs very clear instructions, and frequent check-ins to course correct. When left with vague guidance, it interprets things like “improve the codebase and add features” as linting, refactoring, and needlessly shuffling around code. And it has grand plans that it doesn’t quite follow through on, leaving behind a trail of TODOs.

[Fork the example from GitHub](https://github.com/gensx-inc/gensx/tree/main/examples/self-modifying-code) and form your own opinion.

If you’re interested in learning more about GenSX and building agents that bring sci-fi to life, check out the [getting started guide](/docs/quickstart) and join our community on [discord](https://discord.gg/wRmwfz5tCy).
