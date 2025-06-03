import { anthropic } from "@ai-sdk/anthropic";
import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
// Conditional import for storage - will be available when package is installed
// import { useSearch } from "@gensx/storage";
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
  citations?: {
    url: string;
    title?: string;
  }[];
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

interface CatalogResearchProps {
  topic: string;
}

interface SearchResult {
  id: string;
  score?: number;
  attributes?: {
    content?: string;
    title?: string;
  };
}

interface CatalogContentItem {
  id: string;
  content: string;
  title: string;
  score: number;
}

const CatalogResearch = gensx.Component(
  "CatalogResearch",
  (props: CatalogResearchProps) => {
    try {
      // TODO: Implement when @gensx/storage is available
      // For now, we'll use text-based search when the storage package is available
      // const search = await useSearch("documentation");

      // const results = await search.query({
      //   // Use text-based search instead of embeddings to avoid OpenAI dependency
      //   topK: 5,
      //   includeAttributes: true,
      //   filters: [
      //     ["content", "Contains", props.topic]
      //   ]
      // });

      // For now, return empty results as placeholder
      const results: SearchResult[] = [];

      return {
        topic: props.topic,
        content: results.map((result: SearchResult) => ({
          id: result.id,
          content: result.attributes?.content ?? "",
          title: result.attributes?.title ?? "",
          score: result.score ?? 0,
        })),
        source: "catalog_research",
      };
    } catch (error) {
      // If search fails (e.g., no documentation indexed), return empty results
      console.warn("Catalog search failed:", error);
      return {
        topic: props.topic,
        content: [],
        source: "catalog_research",
      };
    }
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
    citations: {
      url: string;
      title?: string;
    }[];
    source: string;
  }[];
  catalogResearch: {
    topic: string;
    content: CatalogContentItem[];
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

    // Conduct research for each topic in parallel
    const webResearchPromises = topicsResult.object.topics.map(
      (topic: string) => WebResearch({ topic }),
    );

    const catalogResearchPromises = topicsResult.object.topics.map(
      (topic: string) => CatalogResearch({ topic }),
    );

    const [webResearch, catalogResearch] = await Promise.all([
      Promise.all(webResearchPromises),
      Promise.all(catalogResearchPromises),
    ]);

    return {
      topics: topicsResult.object.topics,
      webResearch,
      catalogResearch,
    };
  },
);

export { Research };
