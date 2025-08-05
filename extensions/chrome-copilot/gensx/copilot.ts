/**
 * New LLM-based Copilot Workflow
 * Replaces multiAgentWorkflow.ts with the new architecture
 */

import * as gensx from "@gensx/core";
import { executeExternalTool } from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { createOpenAI } from "@ai-sdk/openai";
import { asToolSet, streamText } from "@gensx/vercel-ai";
import { CoreMessage } from "ai";
import { tool } from "ai";
import { z } from "zod";

import { toolbox } from "../src/shared/toolbox";
import { PCDScout } from "./llm/scout";


type ThreadData = {
  messages: CoreMessage[];
};


/**
 * Copilot Workflow using Vercel AI SDK with external tools
 */
export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({
    prompt,
    threadId,
    userId,
    url,
    userName,
    userContext,
  }: {
    prompt: string;
    threadId: string;
    userId: string;
    url: string;
    userName?: string;
    userContext?: string;
  }) => {

    console.log(`🤖 Starting copilot workflow for user ${userId}`);
    console.log(`🌐 Current URL: ${url}`);
    console.log(`💬 User prompt: "${prompt}"`);

    // Load chat history
    const chatHistoryBlob = useBlob<ThreadData>(
      chatHistoryBlobPath(userId, threadId)
    );

    const loadThreadData = async (): Promise<ThreadData> => {
      const data = await chatHistoryBlob.getJSON();
      if (Array.isArray(data)) {
        return { messages: data };
      }
      return data ?? { messages: [] };
    };

    const saveThreadData = async (threadData: ThreadData): Promise<void> => {
      await chatHistoryBlob.putJSON(threadData);
    };

    const threadData = await loadThreadData();
    const existingMessages = threadData.messages;

    console.log(`📚 Loaded ${existingMessages.length} existing messages from thread`);
    
    // Log existing messages for debugging
    existingMessages.forEach((msg, i) => {
      console.log(`📚 Message ${i + 1} [${msg.role}]:`, 
        typeof msg.content === 'string' ? msg.content.substring(0, 100) + '...' : 
        Array.isArray(msg.content) ? `[${msg.content.length} parts]` : msg.content);
    });

    // Add user message
    const userMessage: CoreMessage = {
      role: "user",
      content: prompt
    };

    // Prepare messages for the LLM
    const messages: CoreMessage[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant that can interact with web pages. The user is currently on: ${url}

FLEXIBLE SCOUT APPROACH - Goal-Oriented Analysis:
1. **Start with Scout tool** - it analyzes query intent and adapts to find relevant content/actions
2. **Scout is goal-oriented** - understands what you want to accomplish and finds elements that help achieve it
3. **Use action tools** based on Scout's intelligent recommendations

You have access to tools that let you:
- Use scout tool (PRIMARY - flexible, goal-oriented content analysis with natural language queries)
- Navigate to URLs with navigate (for "go to" requests - navigates in current tab)
- Click elements with dom_click  
- Type text with dom_type
- Submit forms with dom_submit
- Scroll pages with dom_scroll
- Open/switch/close tabs with tabs_open, tabs_switch, tabs_close

Simple fallback tools (rarely needed):
- Find specific text with dom_findByText (search for elements containing specific text)
- Get basic page content with dom_getPageContent
- Get page structure with getMiniPCD (only if Scout fails)

**Why Scout is powerful:**
- Adapts to different query types: information queries, action queries, navigation, forms, etc.
- Analyzes query intent (what the user wants to accomplish) and search strategy
- Detects relevant patterns (emails, dates, phone numbers) based on the query goal
- Performs targeted searches for query-relevant content
- Works reliably on any website layout without depending on specific structures
- Provides comprehensive results that match the user's actual goal

**Flexible Workflow:**
1. Scout with natural language query (analyzes intent + finds goal-relevant elements)
2. Use action tools based on Scout's intelligent recommendations
3. Scout handles complexity and adapts to your specific needs

Scout will intelligently:
- Analyze your query intent (information, action, navigation, etc.)
- Detect relevant patterns based on your goal
- Search for elements that help accomplish your objective  
- Provide comprehensive action bundles for all relevant items found
- Give you everything needed to achieve your goal rather than generic page parsing

Current user context: ${userContext || 'None provided'}
User name: ${userName || 'Unknown'}

Be conversational and helpful. The new Scout tool is much more reliable at finding all information on any website.`
      },
      ...existingMessages,
      userMessage
    ];


    // Track all messages including responses - start with the input messages
    const allMessages: CoreMessage[] = [
      ...existingMessages,
      userMessage
    ];

    const publishMessages = () => {
      gensx.publishObject("messages", {
        messages: JSON.parse(JSON.stringify(allMessages)),
      });
    };

    // Publish the initial messages (including user message) immediately
    publishMessages();

    // State for streaming
    let response = "";
    let accumulatedText = "";
    const contentParts: Array<any> = [];
    let assistantMessageIndex: number | null = null;

    // Create flexible scout tool for goal-oriented content analysis
    const scoutTool = tool({
      description: "Flexible Scout for goal-oriented page analysis - adapts to any query type and extracts meaningful content/actions based on user goals. Works on any website without depending on specific structures.",
      parameters: z.object({
        query: z.string().describe("Natural language query describing what the user wants to find or do"),
        maxCandidates: z.number().optional().default(5).describe("Maximum number of action bundles to return")
      }),
      execute: async ({ query, maxCandidates = 5 }) => {
        console.log(`🕵️ Scout tool called with query: "${query}"`);
        
        try {
          // Get current MiniPCD through external tools
          const miniPCDResult = await executeExternalTool(toolbox, 'getMiniPCD', {});
          if (!miniPCDResult.ok || !miniPCDResult.data) {
            return { error: "Failed to get current page data" };
          }

          // Create a tool executor for the scout
          const toolExecutor = async (call: any): Promise<any> => {
            const result = await executeExternalTool(toolbox, call.name as keyof typeof toolbox, call.args);
            return result;
          };

          // Run PCD Scout
          const actionBundles = await PCDScout({
            query,
            miniPCD: miniPCDResult.data,
            maxCandidates,
            toolExecutor
          });

          console.log(`🕵️ Scout found ${actionBundles.length} action bundles`);
          return { actionBundles };
          
        } catch (error) {
          console.error(`🕵️ Scout tool error:`, error);
          return { error: error instanceof Error ? error.message : 'Scout execution failed' };
        }
      }
    });

    // Combine scout tool with regular toolbox
    const tools = {
      scout: scoutTool,
      ...asToolSet(toolbox)
    };

    const groqClient = createOpenAI({
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: "https://api.groq.com/openai/v1",
    });

    // const model = anthropic("claude-3-7-sonnet-latest");

    const model = groqClient("moonshotai/kimi-k2-instruct");

    const result = streamText({
      model,
      messages,
      tools,
      maxSteps: 25,
      temperature: 0,
      onChunk: ({ chunk }) => {
        if (assistantMessageIndex === null) {
          // Add initial assistant message
          assistantMessageIndex = allMessages.length;
          allMessages.push({
            role: "assistant",
            content: [],
          });
        }

        switch (chunk.type) {
          case "text-delta":
            accumulatedText += chunk.textDelta;

            // Update or add text part
            const existingTextPartIndex = contentParts.findIndex(
              (part) => part.type === "text",
            );
            if (existingTextPartIndex >= 0) {
              contentParts[existingTextPartIndex].text = accumulatedText;
            } else {
              contentParts.push({
                type: "text",
                text: accumulatedText,
              });
            }
            allMessages[assistantMessageIndex].content = [...contentParts];
            publishMessages();
            break;

          case "tool-call":
            console.log(`🔧 Tool call: ${chunk.toolName} [${chunk.toolCallId}]`, chunk.args);

            // Parse args if they're a string
            let parsedArgs = chunk.args;
            if (typeof chunk.args === "string") {
              try {
                parsedArgs = JSON.parse(chunk.args);
              } catch {
                console.warn("Failed to parse tool args:", chunk.args);
                parsedArgs = chunk.args;
              }
            }

            contentParts.push({
              type: "tool-call",
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: parsedArgs,
            });
            allMessages[assistantMessageIndex].content = [...contentParts];
            publishMessages();
            break;


          default:
            break;
        }
      },
      onStepFinish: (step) => {
        console.log(`📋 Step completed:`);

        // Log tool results if available
        if (step.toolResults && Array.isArray(step.toolResults)) {
          step.toolResults.forEach((toolResult: any) => {
            console.log(`🔧 Tool result: ${toolResult.toolName || 'unknown'} [${toolResult.toolCallId || 'no-id'}]`, JSON.stringify(toolResult, null, 2));
          });
        }

        // Reset for next step
        assistantMessageIndex = null;
        accumulatedText = "";
        contentParts.length = 0;

        publishMessages();
      },
      onFinish: (result) => {
        publishMessages();
      },
      onError: (error) => {
        console.error(`❌ StreamText error:`, error);
      },
    });

    try {
      response = await result.text;
      console.log(`✅ Workflow completed successfully`);
      console.log(`🤖 Assistant response: "${response}"`);
    } catch (error) {
      console.error(`❌ Error waiting for streaming result:`, error);
      response = "There was an error processing your request.";
    }


    // Save updated conversation with proper message format for OpenAI
    const finalMessages = allMessages.map(msg => {
      // Ensure assistant messages with tool calls have proper structure
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        const hasToolCalls = msg.content.some((part: any) => part.type === 'tool-call');
        const hasText = msg.content.some((part: any) => part.type === 'text');

        if (hasToolCalls && !hasText) {
          // This is a tool-call only message, keep as-is
          return msg;
        } else if (hasText && !hasToolCalls) {
          // This is a text-only message, convert content to string
          const textParts = msg.content.filter((part: any) => part.type === 'text');
          return {
            ...msg,
            content: textParts.map((part: any) => part.text).join('')
          };
        }
      }

      // Ensure tool messages have proper structure for OpenAI
      if (msg.role === 'tool' && (msg as any).toolCallId) {
        // Convert to OpenAI format
        return {
          role: 'tool' as const,
          tool_call_id: (msg as any).toolCallId,
          content: Array.isArray(msg.content) ?
            msg.content.map((part: any) => part.text || JSON.stringify(part)).join('') :
            typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        } as any;
      }

      return msg;
    });

    await saveThreadData({ messages: allMessages as any });

    return { response, messages: allMessages };
  }
);



function chatHistoryBlobPath(userId: string, threadId: string): string {
  return `chat-history/${userId}/${threadId}.json`;
}
