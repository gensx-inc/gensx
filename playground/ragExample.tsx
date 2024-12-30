import { gsx } from "@/index";
import { ChatCompletion } from "./chatCompletion";
import type { WorkflowComponent, Element } from "@/types";
import OpenAI from "openai";
import { Turbopuffer } from "@turbopuffer/turbopuffer";

// Initialize clients
const pplx = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tpuf = new Turbopuffer({
  apiKey: process.env.TURBOPUFFER_API_KEY as string,
  baseUrl: "https://gcp-us-west1.turbopuffer.com",
});

// Research providers
interface ResearchResult {
  content: string;
  source: string;
  relevance?: number;
  metadata?: Record<string, unknown>;
}

interface TurboPufferResult {
  id: string;
  vector?: number[];
  attributes: Record<string, unknown> & {
    content: string;
    url: string;
  };
  dist?: number;
  score?: number;
}

// Perplexity-based research provider
export const PerplexityResearch = gsx.Component<
  { query: string },
  ResearchResult[]
>(async ({ query }) => {
  try {
    const response = await pplx.chat.completions.create({
      model: "llama-3.1-sonar-large-128k-online",
      messages: [
        {
          role: "system",
          content:
            "You are an AI research assistant. Your job is to find relevant online information and provide detailed answers.",
        },
        {
          role: "user",
          content: query,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content in response");

    return [
      {
        content,
        source: "perplexity.ai",
        metadata: {
          model: "llama-3.1-sonar-large-128k-online",
        },
      },
    ];
  } catch (error) {
    console.error("Perplexity research failed:", error);
    return [];
  }
});

// TurboPuffer-based research provider
export const TurboPufferResearch = gsx.Component<
  { query: string },
  ResearchResult[]
>(async ({ query }) => {
  try {
    // Create embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Query the namespace
    const ns = tpuf.namespace("docs"); // You might want to make this configurable
    const queryResults = (await ns.query({
      vector: embedding,
      top_k: 3,
      include_attributes: true,
      distance_metric: "cosine_distance",
    })) as TurboPufferResult[];

    // Transform results to ResearchResult format
    return queryResults.map(result => {
      // Remove any internal fields we don't want to expose
      const { chunk, documentId, ...metadata } = result.attributes;

      return {
        content: result.attributes.content,
        source: result.attributes.url,
        relevance: result.score ?? 1.0,
        metadata,
      };
    });
  } catch (error) {
    console.error("TurboPuffer research failed:", error);
    return [];
  }
});

// RAG workflow using research providers
interface RAGWorkflowProps {
  query: string;
  researchProvider: WorkflowComponent<{ query: string }, ResearchResult[]>;
}

export const RAGWorkflow = gsx.Component<RAGWorkflowProps, string>(
  async ({ query, researchProvider: ResearchProvider }) => {
    const element: Element = (
      <ResearchProvider query={query}>
        {(results: ResearchResult[]) => {
          const context = results
            .sort((a: ResearchResult, b: ResearchResult) => {
              // If neither has relevance, maintain original order
              if (!a.relevance && !b.relevance) return 0;
              // If only one has relevance, prioritize the one with relevance
              if (!a.relevance) return 1;
              if (!b.relevance) return -1;
              // If both have relevance, sort by score
              return b.relevance - a.relevance;
            })
            .slice(0, 3)
            .map((r: ResearchResult) => `[${r.source}]: ${r.content}`)
            .join("\n\n");

          return (
            <ChatCompletion
              prompt={`Answer based on this context:\n\n${context}\n\nQuery: ${query}`}
            />
          );
        }}
      </ResearchProvider>
    );
    return element;
  },
);

// Example usage
async function runRAGExample() {
  console.log("\n🔍 Running RAG example with different providers...");

  // Using Perplexity
  console.log("\nUsing Perplexity:");
  const perplexityAnswer = await gsx.execute<string>(
    <RAGWorkflow
      query="What is the capital of France?"
      researchProvider={PerplexityResearch}
    />,
  );
  console.log("Answer:", perplexityAnswer);

  // Using TurboPuffer
  console.log("\nUsing TurboPuffer:");
  const turboPufferAnswer = await gsx.execute<string>(
    <RAGWorkflow
      query="What is the capital of France?"
      researchProvider={TurboPufferResearch}
    />,
  );
  console.log("Answer:", turboPufferAnswer);
}

// Run the example
runRAGExample().catch(console.error);
