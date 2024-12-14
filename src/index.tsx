import React from "react";
import { Workflow } from "./core/components/Workflow";
import { BlogWritingWorkflow } from "./examples/blog/BlogWritingWorkflow";
import { TweetWritingWorkflow } from "./examples/tweet/TweetWritingWorkflow";
import { WorkflowContext } from "./core/components/Workflow";
import { createWorkflowOutput } from "./core/hooks/useWorkflowOutput";

async function runParallelWorkflow() {
  const title = "Programmatic Secrets with ESC";
  const prompt = "Write an article...";

  const [blogPost, setBlogPost] = createWorkflowOutput("");
  const [tweet, setTweet] = createWorkflowOutput("");

  const workflow = (
    <Workflow>
      <BlogWritingWorkflow
        title={title}
        prompt={prompt}
        setOutput={setBlogPost}
      />
      <TweetWritingWorkflow content={blogPost} setOutput={setTweet} />
    </Workflow>
  );

  const context = new WorkflowContext(workflow);
  await context.execute();

  console.log("\n=== Parallel Workflow Results ===");
  console.log("Blog Post:", await blogPost);
  console.log("Tweet:", await tweet);
}

async function runNestedWorkflow() {
  const title = "Programmatic Secrets with ESC";
  const prompt = "Write an article...";

  const workflow = (
    <Workflow>
      <BlogWritingWorkflow
        title={new Promise((resolve) => resolve(title))}
        prompt={prompt}
      >
        {(blogPost) => (
          <TweetWritingWorkflow content={blogPost}>
            {(tweet) => {
              console.log("\n=== Nested Workflow Results ===");
              console.log("Tweet:", tweet);
              console.log("Blog Post:", blogPost);
              return null;
            }}
          </TweetWritingWorkflow>
        )}
      </BlogWritingWorkflow>
    </Workflow>
  );

  const context = new WorkflowContext(workflow);
  await context.execute();
}

async function main() {
  try {
    await runParallelWorkflow();
    await runNestedWorkflow();
  } catch (error) {
    console.error("Workflow execution failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
