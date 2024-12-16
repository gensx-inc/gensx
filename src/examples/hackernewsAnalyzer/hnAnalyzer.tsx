import React from "react";
import { createWorkflow } from "../../core/utils/workflow-builder";
import { Workflow } from "../../core/components/Workflow";
import { Join } from "../../core/components/Join";

export type HackerNewsAnalyzerProps = {};

export type HackerNewsAnalyzerOutput = {};

export const HackerNewsAnalyzer = createWorkflow<
  HackerNewsAnalyzerProps,
  HackerNewsAnalyzerOutput
>(async (props, render) => {
  const topHNPosts = await getTopHNTextPosts();
  return (
    <Join
      items={topHNPosts}
      map={(post) => <HackerNewsPostSummarizer post={post} />}
      concurrency="parallel"
    >
      {(summaries) => render(summaries.join("\n"))}
    </Join>
  );
});

export type HackerNewsPostSummarizerProps = {
  post: any;
};

export type HackerNewsPostSummarizerOutput = {
  summary: string;
};

export const HackerNewsPostSummarizer = createWorkflow<
  HackerNewsPostSummarizerProps,
  HackerNewsPostSummarizerOutput
>(async (props, render) => {
  const topHNPosts = await getTopHNTextPosts();
  return render({
    summary: "test",
  });
});

export async function getTopHNTextPosts(): Promise<any[]> {
  try {
    // 1. First get the top stories IDs
    const response = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    const storyIds = await response.json();

    // 2. Get details for each story
    const storyPromises = storyIds.map(async (id: number) => {
      const storyResponse = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`
      );
      return storyResponse.json();
    });

    // 3. Wait for all story details to be fetched
    const stories = await Promise.all(storyPromises);

    // 4. Filter for text-only stories (those with no URL)
    const textStories = stories.filter(
      (story) => story.type === "story" && !story.url && story.text // Ensure there's text content
    );

    // 5. Return the stories with relevant fields
    return textStories.map((story) => ({
      id: story.id,
      title: story.title,
      text: story.text,
      by: story.by,
      time: new Date(story.time * 1000), // Convert Unix timestamp to Date
      score: story.score,
      descendants: story.descendants, // number of comments
    }));
  } catch (error) {
    console.error("Error fetching HN stories:", error);
    throw error;
  }
}
