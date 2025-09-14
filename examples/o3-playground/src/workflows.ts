import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";

interface ChatProps {
  userMessage: string;
}

interface PerplexityResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  citations?: string[];
}

const openai = new OpenAI();

// Define the UXUpdateTool (formerly capture_thinking)
const uxUpdateTool = {
  type: "function" as const,
  function: {
    name: "UXUpdateTool",
    description:
      "CRITICAL: This tool updates the user interface dashboard with your current analysis progress. The user is watching a live dashboard and REQUIRES frequent, detailed updates (1-2 paragraphs) to follow your work. You MUST call this tool every few seconds throughout your analysis - aim for 10-15 updates per response. Users get confused and frustrated without frequent updates. Each update should explain what you're currently analyzing, what you've discovered so far, and what you're planning to investigate next. REMEMBER: These are status updates only - you must still provide a final comprehensive answer to the user's question after all your analysis is complete.",
    parameters: {
      type: "object",
      properties: {
        status_update: {
          type: "string",
          description:
            "A brief update about what you're currently thinking, analyzing, or planning to do next",
        },
      },
      required: ["status_update"],
    },
    parse: JSON.parse,
    function: (args: { status_update: string }) => {
      console.info("🧠 THINKING:", args.status_update);
      return "Status updated successfully. User interface refreshed. Remember to provide a final answer to the user's question when your analysis is complete.";
    },
  },
};

// Define the WebResearch tool
const webResearchTool = {
  type: "function" as const,
  function: {
    name: "web_research",
    description:
      "Research a topic using real-time web search. Use this to get current information, statistics, and recent developments on any topic. You should call this tool at least once, but call it as many times as you need. Always call UXUpdateTool before and after each research call to keep the user informed.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "The specific topic or question to research",
        },
      },
      required: ["topic"],
    },
    parse: JSON.parse,
    function: async (args: { topic: string }) => {
      console.info("🔍 Making web research call for topic:", args.topic);

      try {
        // Use Perplexity API for real-time web research
        const response = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
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
                  content: `Research this topic thoroughly: ${args.topic}. Provide detailed information including recent developments, key statistics, expert opinions, and current trends.`,
                },
              ],
              max_tokens: 2000,
              temperature: 0.2,
            }),
          },
        );

        if (!response.ok) {
          console.error("❌ Perplexity API error:", response.statusText);
          return {
            error: `Research API error: ${response.statusText}`,
            topic: args.topic,
          };
        }

        const data = (await response.json()) as PerplexityResponse;
        const result = {
          topic: args.topic,
          content: data.choices[0]?.message?.content ?? "No content received",
          citations: data.citations ?? [],
          timestamp: new Date().toISOString(),
        };

        console.info("✅ Web research completed for:", args.topic);
        console.info(
          "📄 Research result length:",
          result.content.length,
          "characters",
        );

        return result;
      } catch (error) {
        console.error("❌ Web research error:", error);
        return {
          error: `Research failed: ${error instanceof Error ? error.message : String(error)}`,
          topic: args.topic,
        };
      }
    },
  },
};

const Chat = gensx.Component("Chat", async ({ userMessage }: ChatProps) => {
  // eslint-disable-next-line
  const result = await openai.beta.chat.completions.runTools({
    model: "o3",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful general-purpose chatbot. You are to answer the users question. Your user interface is being monitored closely by the user, so they can see your intermediate processing steps. As you work through their request, use the UXUpdateTool frequently to keep them updated on what you're thinking and doing - they're watching and waiting for your response. They will get extremely frustrated if you don't call this tool frequently. They are monitoring the UX to follow your analysis, monitor it for errors, and potentially correct invalid assumptions in follow ups. It is extremely important that you make frequent and detailed updates to the UX. CRITICAL: After you've completed your analysis and any research, you MUST provide a complete answer to their original question or message. Do NOT just provide UX updates - you MUST end with a comprehensive final response that directly answers their question. The user is waiting for your actual answer, not just status updates. Provide your final answer as regular text, not through the UXUpdateTool.",
      },
      { role: "user", content: userMessage },
    ],
    tools: [uxUpdateTool, webResearchTool],
    max_completion_tokens: 50000,
  });

  return await result.finalContent();
});

const ChatWorkflow = gensx.Workflow(
  "ChatWorkflow",
  async ({ userMessage }: ChatProps) => {
    return await Chat({ userMessage });
  },
);

export { ChatWorkflow };
