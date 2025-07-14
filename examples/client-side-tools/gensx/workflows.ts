import * as gensx from "@gensx/core";
import { Agent } from "./agent";
import { CoreMessage } from "ai";
import { webSearchTool } from "./tools/webSearch";
import { useBlob } from "@gensx/storage";
import { anthropic } from "@ai-sdk/anthropic";
import { asToolSet } from "@gensx/vercel-ai";
import { toolbox } from "./tools/frontendTools";
import { geocodeTool } from "./tools/geocode";

interface ChatAgentProps {
  prompt: string;
  threadId: string;
  userId: string;
  thinking?: boolean;
}

export const ChatAgent = gensx.Workflow(
  "MapAgent",
  async ({ prompt, threadId, userId }: ChatAgentProps) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<CoreMessage[]>(
      `chat-history/${userId}/${threadId}.json`,
    );

    // Function to load chat history
    const loadChatHistory = async (): Promise<CoreMessage[]> => {
      const history = await chatHistoryBlob.getJSON();
      return history ?? [];
    };

    // Function to save chat history
    const saveChatHistory = async (messages: CoreMessage[]): Promise<void> => {
      await chatHistoryBlob.putJSON(messages);
    };

    try {
      // Load existing chat history
      const existingMessages = await loadChatHistory();

      if (existingMessages.length === 0) {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are a helpful geographic assistant that can interact with an interactive map. You have access to several map tools:

- webSearch: Search the web for information relevant to the user's query
- geocode: Geocode a location from an address or a query to a specific location, returned with latitude and longitude, as well as other useful information about the location
- moveMap: Move the map to a specific location with latitude, longitude, and optional zoom level
- placeMarkers: Place markers on the map with optional title, description, and color
- removeMarker: Remove a specific marker by its ID
- clearMarkers: Remove all markers from the map
- getCurrentView: Get the current map view (latitude, longitude, zoom)
- listMarkers: List all markers on the map

When users ask about locations, places, or geographic questions:
1. Use webSearch to find information about the places they're asking about
2. Use geocode (if needed) to get the latitude and longitude of the location
3. Use moveMap to show them the location on the map
4. Use placeMarker to highlight important locations
5. Provide helpful context about the places they're asking about

Always be proactive about using the map tools to enhance the user's experience. If they ask about a place, show it to them on the map!`,
        };

        existingMessages.push(systemMessage);
      }

      // Add the new user message
      const messages: CoreMessage[] = [
        ...existingMessages,
        {
          role: "user",
          content: prompt,
        },
      ];

      const tools = {
        webSearch: webSearchTool,
        geocode: geocodeTool,
        ...asToolSet(toolbox),
      };

      const model = anthropic("claude-3-5-sonnet-20240620");
      const result = await Agent({
        messages,
        tools,
        model,
        // providerOptions: thinking
        //   ? {
        //       anthropic: {
        //         thinking: { type: "enabled", budgetTokens: 12000 },
        //       } satisfies AnthropicProviderOptions,
        //     }
        //   : undefined,
      });

      // Save the complete conversation history
      await saveChatHistory([...messages, ...result.messages]);

      return result;
    } catch (error) {
      console.error("Error in chat processing:", error);
      return {
        response: `Error processing your request in thread ${threadId}. Please try again.`,
        messages: [],
      };
    }
  },
);
