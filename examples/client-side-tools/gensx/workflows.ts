import * as gensx from "@gensx/core";
import { Agent } from "./agent";
import { ModelMessage } from "ai";
import { webSearchTool } from "./tools/web-search";
import { useBlob } from "@gensx/storage";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { toolbox } from "./tools/toolbox";
import { geocodeTool } from "./tools/geocode";
import { reverseGeocodeTool } from "./tools/reverse-geocode";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { locationSearchTool } from "./tools/location-search";
import {
  findBoundingBoxTool,
  findClosestTool,
  calculateDistanceTool,
  isPointInBoundingBoxTool,
  sortPointsByDistanceTool,
  createBoundingBoxTool,
} from "./tools/geometry";

interface ChatAgentProps {
  prompt: string;
  threadId: string;
  userId: string;
  thinking?: boolean;
}

interface ThreadData {
  summary?: string;
  messages: ModelMessage[];
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
        const systemMessage: ModelMessage = {
          role: "system",
          content: `You are a helpful geographic assistant that can interact with an interactive map. You have access to several map tools:

- locationSearch: Location based search to be used for finding places, businesses, and points of interest with advanced filtering options:
  * Search within specific areas using bounding boxes
  * Search along routes between waypoints
  * Filter by categories (restaurants, hotels, gas stations, etc.)
  * Proximity-based search around specific coordinates
- webSearch: Search the web for information and details about a location.
- geocode: Geocode a location from an address or a query to a specific location, returned with latitude and longitude, as well as other useful information about the location
- reverseGeocode: Reverse geocode a location from a specific latitude and longitude to an map object. This can be used to get the address or city, country, etc from a set of coordinates.
- moveMap: Move the map to a specific location with latitude, longitude, and optional zoom level
- placeMarkers: Place markers on the map with optional title, description, and color. Ensure that you move the map so the new markers are visible and include detailed descriptions of the places.
- removeMarker: Remove a specific marker by its ID
- clearMarkers: Remove all markers from the map
- getCurrentView: Get the current map view (latitude, longitude, zoom)
- listMarkers: List all markers on the map
- getUserLocation: Get the user's current location (latitude, longitude)
- calculateAndShowRoute: Calculate a route with multiple stops and display it on the map with turn-by-turn directions. Supports start/end coordinates with optional waypoints and labels.
- clearDirections: Clear any displayed route from the map

You also have access to the following geometry tools:
- findBoundingBox: Find a bounding box around a center point with a given radius in meters
- findClosest: Find the closest point to a given latitude and longitude
- calculateDistance: Calculate the distance between two points
- isPointInBoundingBox: Check if a point is within a bounding box
- sortPointsByDistance: Sort points by distance from a given point
- createBoundingBox: Create a bounding box around a list of points

When users ask about locations, places, or geographic questions:
1. Use locationSearch to find locations, places, or points of interest.
2. Use webSearch to find information about the places they're asking about
3. Use geocode (if needed) to get the latitude and longitude of the location
4. Use locationSearch for finding specific types of places, businesses, or amenities in particular areas
5. Use moveMap to show them the location(s) on the map.
6. Use placeMarkers to highlight important locations and features with detailed descriptions.
7. Provide helpful context about the places they're asking about
8. After placing multiple markers on the map, use the moveMap tool to move the map to show all the markers using a bounding box that includes all the markers.

For location-specific searches (restaurants, hotels, gas stations, etc.):
- Use locationSearch with appropriate category filters
- Consider using proximity search around the user's current location or a specific area
- For route-based searches, use the route parameter to find amenities along a specific path
- Use bounding box searches when users want to find places within a specific geographic area

If you are searching for multiple amenities, places, or locations in one specific area, move the map to the general area first, and then do the search, to help keep the user involved in the process. As you find results add a marker for each place before searching for the next one.

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
3. Gather a title and description for the start, end, and any waypoints along the route
4. Use calculateAndShowRoute to calculate and display the route on the map (this combines routing calculation and display)
5. Do not add extra markers for the route, these are already added by the calculateAndShowRoute tool
6. Do not return the directions in your response, the calculateAndShowRoute tool will show the directions to user already.

For multi-stop routes:
- Include waypoints array with intermediate stops
- Add descriptive labels for start, waypoints, and end points to improve user experience

IMPORTANT: When routing to airports, be specific about the terminal within the airport, and if it is a large airport with multiple terminals, ask the user to confirm the destination:
- For airports, geocode the specific terminal (e.g. "Terminal 1, JFK Airport") or departure/arrival area rather than just the airport name. For small airports, just be sure to route to the terminal.
- This ensures routes go to the correct drop-off/pick-up location instead of just the airport perimeter
- Use labels like "JFK Terminal 1 - Departures" to clarify the exact destination

If the user does not provide an explicit reference to a location, you can assume they are asking about their current location, or the location that the map is currently focused on. Use the getUserLocation tool to get the user's current location, or the getCurrentView tool to get the current map view.

Always be proactive about using the map tools to enhance the user's experience. If they ask about a place, show it to them on the map!

<date>The current date and time is ${new Date().toLocaleString()}.</date>`,
        };

        existingMessages.push(systemMessage);
      } else if (
        existingMessages[0].role === "system" &&
        typeof existingMessages[0].content === "string"
      ) {
        // update the system message with the current date and time
        existingMessages[0].content = existingMessages[0].content.replace(
          /<date>.*<\/date>/,
          `<date>The current date and time is ${new Date().toLocaleString()}.</date>`,
        );
      }

      // Add the new user message
      const messages: ModelMessage[] = [
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
        locationSearch: locationSearchTool,
        findBoundingBox: findBoundingBoxTool,
        findClosest: findClosestTool,
        calculateDistance: calculateDistanceTool,
        isPointInBoundingBox: isPointInBoundingBoxTool,
        sortPointsByDistance: sortPointsByDistanceTool,
        createBoundingBox: createBoundingBoxTool,
        ...asToolSet(toolbox),
      };

      const groqClient = createOpenAICompatible({
        name: "groq",
        apiKey: process.env.GROQ_API_KEY!,
        baseURL: "https://api.groq.com/openai/v1",
      });

      const model = groqClient("moonshotai/kimi-k2-instruct");
      const result = await Agent({
        messages,
        tools,
        model,
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
      const groqClient = createOpenAICompatible({
        name: "groq",
        apiKey: process.env.GROQ_API_KEY!,
        baseURL: "https://api.groq.com/openai/v1",
      });

      const model = groqClient("moonshotai/kimi-k2-instruct");

      const result = await generateText({
        model,
        prompt: `Please create a concise 3-5 word summary of this user question/request. Focus on the main topic or intent. Examples:
- "Tell me about Paris" → Paris Information
- "Find restaurants near me" → Local Restaurant Search
- "How to bake a cake" → Cake Baking Instructions
- "What's the weather like?" → Weather Check

User message: "${userMessage}"

Summary:`,
        maxOutputTokens: 50,
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
