import * as gensx from "@gensx/core";
import { Agent } from "./agent";
import { CoreMessage } from "ai";
import { webSearchTool } from "./tools/web-search";
import { useBlob } from "@gensx/storage";
import { anthropic } from "@ai-sdk/anthropic";
import { asToolSet } from "@gensx/vercel-ai";
import { toolbox } from "./tools/toolbox";
import { geocodeTool } from "./tools/geocode";
import { generateText } from "ai";
import { reverseGeocodeTool } from "./tools/reverse-geocode";

interface ChatAgentProps {
  prompt: string;
  threadId: string;
  userId: string;
  thinking?: boolean;
}

interface ThreadData {
  summary?: string;
  messages: CoreMessage[];
}

export const ChatAgent = gensx.Workflow(
  "MapAgent",
  async ({ prompt, threadId, userId }: ChatAgentProps) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<ThreadData>(
      `chat-history/${userId}/${threadId}.json`,
    );

    // Function to load thread data
    const loadThreadData = async (): Promise<ThreadData> => {
      const data = await chatHistoryBlob.getJSON();

      // Handle old format (array of messages) - convert to new format
      if (Array.isArray(data)) {
        return { messages: data };
      }

      return data ?? { messages: [] };
    };

    // Function to save thread data
    const saveThreadData = async (threadData: ThreadData): Promise<void> => {
      await chatHistoryBlob.putJSON(threadData);
    };

    try {
      // Load existing thread data
      const threadData = await loadThreadData();
      const existingMessages = threadData.messages;

      // Check if this is a new thread (no messages yet)
      const isNewThread = existingMessages.length === 0;

      if (isNewThread) {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are a helpful geographic assistant that can interact with an interactive map. You have access to several map tools:

- webSearch: Search the web for information relevant to the user's query and images related to the query.
- geocode: Geocode a location from an address or a query to a specific location, returned with latitude and longitude, as well as other useful information about the location
- reverseGeocode: Reverse geocode a location from a specific latitude and longitude to an map object. This can be used to get the address or city, country, etc from a set of coordinates.
- moveMap: Move the map to a specific location with latitude, longitude, and optional zoom level
- placeMarkers: Place markers on the map with optional title, description, color, and photoUrl. Ensure that you move the map so the new markers are visible.
- removeMarker: Remove a specific marker by its ID
- clearMarkers: Remove all markers from the map
- getCurrentView: Get the current map view (latitude, longitude, zoom)
- listMarkers: List all markers on the map
- getUserLocation: Get the user's current location (latitude, longitude)
- calculateAndShowRoute: Calculate a route with multiple stops and display it on the map with turn-by-turn directions. Supports start/end coordinates with optional waypoints and labels.
- clearDirections: Clear any displayed route from the map

When users ask about locations, places, or geographic questions:
1. Use webSearch to find information about the places they're asking about
2. Use geocode (if needed) to get the latitude and longitude of the location
3. Use moveMap to show them the location(s) on the map.
4. Use placeMarkers to highlight important locations and features
5. Provide helpful context about the places they're asking about

## Directions and Navigation:
Offer to provide directions when users are looking for local amenities, businesses, or places they might want to visit. This includes:
- Restaurants, cafes, shopping centers
- Tourist attractions, parks, museums
- Services like hospitals, gas stations, parking
- Any place where the user might reasonably want to go

DO NOT offer directions for:
- General information searches about distant cities or countries
- Historical or educational queries about places
- Weather or news about remote locations
- Academic or research-oriented location questions

When providing directions:
1. First use geocode to get coordinates for the destination (and waypoints if multiple stops)
2. Use getUserLocation to get the user's current position (or use the current map view)
3. Use calculateAndShowRoute to calculate and display the route on the map (this combines routing calculation and display)
4. Present the directions in a clear, actionable format

For multi-stop routes:
- Include waypoints array with intermediate stops
- Add descriptive labels for start, waypoints, and end points to improve user experience

IMPORTANT: When routing to airports, be specific about the terminal or destination within the airport, and ask the user to confirm the destination:
- For airports, geocode the specific terminal (e.g. "Terminal 1, JFK Airport") or departure/arrival area rather than just the airport name
- This ensures routes go to the correct drop-off/pick-up location instead of just the airport perimeter
- Use labels like "JFK Terminal 1 - Departures" to clarify the exact destination

If the user does not provide an explicit reference to a location, you can assume they are asking about their current location, or the location that the map is currently focused on. Use the right tool to get the information you need to answer the question.

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

      // Generate summary for new threads
      let summaryPromise = Promise.resolve(threadData.summary);
      if (isNewThread) {
        summaryPromise = GenerateSummary({ userMessage: prompt });
      }

      const tools = {
        webSearch: webSearchTool,
        geocode: geocodeTool,
        reverseGeocode: reverseGeocodeTool,
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

      const summary = await summaryPromise;

      // Save the complete thread data including summary
      await saveThreadData({
        summary,
        messages: [...messages, ...result.messages],
      });

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

const GenerateSummary = gensx.Component(
  "GenerateSummary",
  async ({ userMessage }: { userMessage: string }): Promise<string> => {
    try {
      const result = await generateText({
        model: anthropic("claude-3-haiku-20240307"),
        prompt: `Please create a concise 3-5 word summary of this user question/request. Focus on the main topic or intent. Examples:
- "Tell me about Paris" → Paris Information
- "Find restaurants near me" → Local Restaurant Search
- "How to bake a cake" → Cake Baking Instructions
- "What's the weather like?" → Weather Check

User message: "${userMessage}"

Summary:`,
        maxTokens: 50,
      });

      // Remove quotes and trim whitespace
      let summary = result.text.trim();
      if (summary.startsWith('"') && summary.endsWith('"')) {
        summary = summary.slice(1, -1);
      }
      if (summary.startsWith("'") && summary.endsWith("'")) {
        summary = summary.slice(1, -1);
      }

      gensx.publishEvent("summary-generated", { summary });

      return summary;
    } catch (error) {
      console.error("Error generating summary:", error);
      // Fallback to truncated user message
      return userMessage.length > 30
        ? userMessage.substring(0, 30) + "..."
        : userMessage;
    }
  },
);
