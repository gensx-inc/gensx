import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { createMemory } from "@gensx/storage";
import { generateText } from "@gensx/vercel-ai";

// Define our chat message type structure
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Create a simple agent component that generates responses
export const ChatAgent = gensx.Component(
  "ChatAgent",
  async ({ messages }: { messages: ChatMessage[] }): Promise<string> => {
    const result = await generateText({
      messages,
      model: openai("gpt-4o-mini"),
    });
    return result.text;
  },
);

export const SmartChatWithMemory = gensx.Component(
  "SmartChatWithMemory",
  async ({
    userInput,
    threadId,
    userId = "default-user",
  }: {
    userInput: string;
    threadId: string;
    userId?: string;
  }): Promise<string> => {
    try {
      // Create memory instance with scoped namespacing
      const memory = createMemory({
        scope: {
          workspaceId: "chat-example",
          userId,
          agentId: "chat-assistant",
          threadId,
        },
        policy: {
          shortTerm: {
            tokenLimit: 4000,
            summarizeOverflow: true,
          },
          observability: {
            trace: true,
          },
        },
      });

      // Create agent with automatic memory integration
      const agentWithMemory = await memory.attach(ChatAgent, {
        preRecall: {
          limit: 5,
          types: ["semantic", "episodic", "shortTerm"],
        },
        injectMode: "systemPreamble",
        postTurn: {
          logEpisodic: true,
          extractFacts: true,
        },
      });

      // Add current user input to short-term memory
      await memory.remember({
        text: userInput,
        type: "shortTerm",
        source: "user_input",
        importance: "medium",
        tags: ["conversation", "user"],
      });

      // Generate response with memory-enhanced agent
      const response = await agentWithMemory({
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that remembers previous conversations and user preferences.",
          },
          {
            role: "user",
            content: userInput,
          },
        ],
      });

      // Add response to short-term memory
      await memory.remember({
        text: response,
        type: "shortTerm",
        source: "assistant_response",
        importance: "medium",
        tags: ["conversation", "assistant"],
      });

      console.log(`[Thread ${threadId}] Generated response with memory context`);
      return response;
    } catch (error) {
      console.error("Error in smart chat processing:", error);
      return `Error processing your request in thread ${threadId}. Please try again.`;
    }
  },
);

// Traditional memory approach for comparison
export const SimpleChatWithMemory = gensx.Component(
  "SimpleChatWithMemory",
  async ({
    userInput,
    threadId,
    userId = "default-user",
  }: {
    userInput: string;
    threadId: string;
    userId?: string;
  }): Promise<string> => {
    try {
      // Create memory instance
      const memory = createMemory({
        scope: {
          workspaceId: "chat-example", 
          userId,
          threadId,
        },
      });

      // Store user input
      await memory.remember({
        text: userInput,
        type: "shortTerm",
        source: "user",
        tags: ["conversation"],
      });

      // Recall relevant context (last 5 messages)
      const context = await memory.recall({
        types: ["shortTerm"],
        limit: 10,
      });

      // Build conversation history from memory
      const messages: ChatMessage[] = [
        {
          role: "system",
          content: "You are a helpful assistant. Use the conversation context provided.",
        },
      ];

      // Add context from memory
      if (context.length > 0) {
        const contextText = context
          .map((item) => `- ${item.item.text}`)
          .join("\n");
        
        messages.push({
          role: "system",
          content: `Recent conversation context:\n${contextText}`,
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: userInput,
      });

      // Generate response
      const result = await generateText({
        messages,
        model: openai("gpt-4o-mini"),
      });

      // Store assistant response
      await memory.remember({
        text: result.text,
        type: "shortTerm",
        source: "assistant", 
        tags: ["conversation"],
      });

      console.log(`[Thread ${threadId}] Simple chat completed`);
      return result.text;
    } catch (error) {
      console.error("Error in simple chat processing:", error);
      return `Error processing your request in thread ${threadId}. Please try again.`;
    }
  },
);

// Workflow that demonstrates both approaches
export const ChatMemoryWorkflow = gensx.Workflow(
  "ChatMemoryWorkflow",
  async ({
    userInput,
    threadId,
    userId = "default-user",
    useSmartMemory = true,
  }: {
    userInput: string;
    threadId: string;
    userId?: string;
    useSmartMemory?: boolean;
  }) => {
    if (useSmartMemory) {
      return await SmartChatWithMemory({ userInput, threadId, userId });
    } else {
      return await SimpleChatWithMemory({ userInput, threadId, userId });
    }
  },
);

// Memory demonstration workflow
export const MemoryDemoWorkflow = gensx.Workflow(
  "MemoryDemoWorkflow",
  async ({
    userId = "demo-user",
    threadId = "demo-thread",
  }: {
    userId?: string;
    threadId?: string;
  }) => {
    const memory = createMemory({
      scope: {
        workspaceId: "demo",
        userId,
        threadId,
      },
    });

    console.log("🧠 GenSX Memory Demo");

    // 1. Store some user preferences
    await memory.remember({
      text: "User prefers concise responses and technical explanations",
      type: "semantic",
      importance: "high",
      tags: ["preference", "communication-style"],
      source: "user_profile",
    });

    await memory.remember({
      text: "User is a software engineer working on TypeScript projects",
      type: "semantic",
      importance: "medium",
      tags: ["profession", "technology"],
      source: "user_profile", 
    });

    // 2. Store some conversation history
    await memory.remember({
      text: "User asked about implementing authentication in Next.js",
      type: "episodic",
      importance: "medium",
      tags: ["discussion", "nextjs", "auth"],
      source: "conversation",
    });

    await memory.remember({
      text: "Provided guidance on using NextAuth.js with JWT tokens",
      type: "episodic",
      importance: "medium", 
      tags: ["discussion", "nextjs", "auth", "solution"],
      source: "conversation",
    });

    // 3. Query memory to see what we remember
    console.log("\n📝 Semantic search for 'What does the user prefer?'");
    const preferences = await memory.recall({
      query: "What does the user prefer?",
      types: ["semantic"],
      limit: 3,
    });

    preferences.forEach((result, i) => {
      console.log(`${i + 1}. [Score: ${result.score.toFixed(3)}] ${result.item.text}`);
    });

    console.log("\n🔍 Recent technical discussions:");
    const discussions = await memory.recall({
      tags: ["discussion"],
      limit: 5,
    });

    discussions.forEach((result, i) => {
      console.log(`${i + 1}. ${result.item.text}`);
    });

    console.log("\n✨ Memory demo completed!");
    return {
      preferences: preferences.length,
      discussions: discussions.length,
      totalMemories: preferences.length + discussions.length,
    };
  },
);