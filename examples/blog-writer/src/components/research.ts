import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { z } from "zod";

interface TopicProps {
  title: string;
  prompt: string;
}

const GenerateTopics = gensx.Component(
  "GenerateTopics",
  async (props: TopicProps) => {
    return await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: z.object({
        topics: z.array(z.string()),
      }),
      prompt: `Generate 5-7 specific research topics for a blog post titled "${props.title}".
      Context: ${props.prompt}

      Focus on topics that would benefit from current, real-time information and detailed analysis.`,
    });
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
    return {
      topic: props.topic,
      content: data.choices[0]?.message?.content ?? "",
      citations: data.citations ?? [],
      source: "web_research",
    };
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

const Research = gensx.Component(
  "Research",
  async (props: ResearchProps): Promise<ResearchResult> => {
    // Generate research topics
    const topicsResult = await GenerateTopics({
      title: props.title,
      prompt: props.prompt,
    });

    // Conduct web research for each topic
    const webResearchPromises = topicsResult.object.topics.map(
      (topic: string) => WebResearch({ topic }),
    );

    const webResearch = await Promise.all(webResearchPromises);

    return {
      topics: topicsResult.object.topics,
      webResearch,
    };
  },
);

export { Research, WebResearch };
