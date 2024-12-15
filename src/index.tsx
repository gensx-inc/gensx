import React from "react";
import { Workflow } from "./core/components/Workflow";
import { BlogWritingWorkflow } from "./examples/blog/BlogWritingWorkflow";
import { TweetWritingWorkflow } from "./examples/tweet/TweetWritingWorkflow";
import { WorkflowContext } from "./core/components/Workflow";
import { createWorkflowOutput } from "./core/hooks/useWorkflowOutput";
import { getTopHNTextPosts } from "./examples/hackernewsAnalyzer/hnAnalyzer";
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

  let blogPost = "";
  let tweet = "";

  const workflow = (
    <Workflow>
      <BlogWritingWorkflow
        title={new Promise((resolve) => resolve(title))}
        prompt={prompt}
      >
        {(blogPostResult) => (
          <TweetWritingWorkflow content={blogPostResult}>
            {(tweetResult) => {
              blogPost = blogPostResult;
              tweet = tweetResult;
              return null;
            }}
          </TweetWritingWorkflow>
        )}
      </BlogWritingWorkflow>
    </Workflow>
  );

  const context = new WorkflowContext(workflow);
  await context.execute();

  console.log("\n=== Nested Workflow Results ===");
  console.log("Blog Post:", blogPost);
  console.log("Tweet:", tweet);
}

async function runHackerNewsWorkflow() {
  const topHNPosts = await getTopHNTextPosts();
  console.log(topHNPosts);
}

async function main() {
  try {
    // await runParallelWorkflow();
    // await runNestedWorkflow();
    await runHackerNewsWorkflow();
  } catch (error) {
    console.error("Workflow execution failed:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
