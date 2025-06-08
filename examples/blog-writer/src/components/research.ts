import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";

// State interface for Research component
interface ResearchState {
  topics: string[];
  completedTopics: string[];
  currentTopic?: string;
  phase: "generating" | "researching" | "complete";
  webResearchCount: number;
  totalTopics: number;
}

interface TopicProps {
  title: string;
  prompt: string;
}

const GenerateTopics = gensx.Component(
  "GenerateTopics",
  async (props: TopicProps) => {
    gensx.emitProgress("Generating research topics...");

    const result = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: z.object({
        topics: z.array(z.string()),
      }),
      prompt: `Generate 5-7 specific research topics for a blog post titled "${props.title}".
      Context: ${props.prompt}

      Focus on topics that would benefit from current, real-time information and detailed analysis.`,
    });

    gensx.emitProgress(`Found ${result.object.topics.length} research topics`);
    return result;
  },
);

interface WebResearchProps {
  topic: string;
}

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  citations?: string[];
}

const WebResearch = gensx.Component(
  "WebResearch",
  async (props: WebResearchProps) => {
    gensx.emitProgress(`Researching: ${props.topic}`);

    // Use Perplexity API for real-time web research
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant. Provide comprehensive, well-sourced information on the given topic. Include recent developments, statistics, and key insights.",
          },
          {
            role: "user",
            content: `Research this topic thoroughly: ${props.topic}. Provide detailed information including recent developments, key statistics, expert opinions, and current trends.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.statusText}`);
    }

    const data = (await response.json()) as PerplexityResponse;
    const result = {
      topic: props.topic,
      content: data.choices[0]?.message?.content ?? "",
      citations: data.citations ?? [],
      source: "web_research",
    };

    gensx.emitProgress(`Completed research: ${props.topic}`);
    return result;
  },
);

interface ResearchProps {
  title: string;
  prompt: string;
}

interface ResearchResult {
  topics: string[];
  webResearch: {
    topic: string;
    content: string;
    citations: string[];
    source: string;
  }[];
}

// Convert to StatefulComponent with proper state management
const Research = gensx.StatefulComponent("Research", (props: ResearchProps) => {
  // Component creates its own state
  const state = gensx.componentState<ResearchState>({
    topics: [],
    completedTopics: [],
    currentTopic: undefined,
    phase: "generating",
    webResearchCount: 0,
    totalTopics: 0,
  });

  const outputPromise = (async (): Promise<ResearchResult> => {
    gensx.emitProgress("Starting research phase...");

    // Update state to generating phase
    state.update((s) => ({ ...s, phase: "generating" }));

    // Generate research topics
    const topicsResult = await GenerateTopics({
      title: props.title,
      prompt: props.prompt,
    });

    // Update state with topics
    state.update((s) => ({
      ...s,
      topics: topicsResult.object.topics,
      totalTopics: topicsResult.object.topics.length,
      phase: "researching",
    }));

    // Conduct web research for each topic
    const webResearchPromises = topicsResult.object.topics.map(
      async (topic: string) => {
        // Update current topic being researched
        state.update((s) => ({ ...s, currentTopic: topic }));

        const result = await WebResearch({ topic });

        // Update completed topics and count
        state.update((s) => ({
          ...s,
          completedTopics: [...s.completedTopics, topic],
          webResearchCount: s.webResearchCount + 1,
        }));

        return result;
      },
    );

    const webResearch = await Promise.all(webResearchPromises);

    // Update state to complete
    state.update((s) => ({
      ...s,
      phase: "complete",
      currentTopic: undefined,
    }));

    gensx.emitProgress("Research phase complete");

    return {
      topics: topicsResult.object.topics,
      webResearch,
    };
  })();

  return { output: outputPromise, state };
});

export { Research, WebResearch };
export type { ResearchState };
