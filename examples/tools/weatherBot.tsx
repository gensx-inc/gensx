import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

// Define our schemas
const WeatherParams = z.object({
  location: z.string().describe("The city and state or country"),
});

const WeatherResponse = z.object({
  temperature: z.number(),
  conditions: z.string(),
});

type WeatherParams = z.infer<typeof WeatherParams>;
type WeatherResponse = z.infer<typeof WeatherResponse>;

// Mock weather API function
async function getWeather(params: WeatherParams): Promise<WeatherResponse> {
  // In a real implementation, this would call a weather API
  return {
    temperature: 72,
    conditions: "sunny",
  };
}

// Component that handles weather queries
const WeatherBot = gsx.Component<{ query: string }>(
  "WeatherBot",
  ({ query }) => {
    return (
      <ChatCompletion
        model="gpt-4-turbo-preview"
        temperature={0}
        tools={[
          {
            name: "getWeather",
            description: "Get the current weather for a location",
            parameters: WeatherParams,
            handler: getWeather,
          },
        ]}
        messages={[
          {
            role: "system",
            content:
              "You are a helpful weather assistant. Use the getWeather function when asked about weather.",
          },
          { role: "user", content: query },
        ]}
      >
        {async (response) => {
          // If it's a tool call
          if (response.type === "tool_call") {
            // The response will be an array of tool calls
            const results = await Promise.all(
              response.calls.map(async (call) => {
                if (call.name === "getWeather") {
                  // Parameters are already validated by Zod
                  return await getWeather(call.parameters);
                }
                throw new Error(`Unknown tool: ${call.name}`);
              }),
            );

            // Continue the conversation with the function results
            return (
              <ChatCompletion
                model="gpt-4-turbo-preview"
                temperature={0}
                messages={[
                  {
                    role: "system",
                    content:
                      "You are a helpful weather assistant. Use the getWeather function when asked about weather.",
                  },
                  { role: "user", content: query },
                  {
                    role: "assistant",
                    content: null,
                    tool_calls: response.calls.map((call, index) => ({
                      id: call.id,
                      type: "function",
                      function: {
                        name: call.name,
                        arguments: JSON.stringify(call.parameters),
                      },
                    })),
                  },
                  ...response.calls.map((call, index) => ({
                    role: "tool" as const,
                    tool_call_id: call.id,
                    content: JSON.stringify(results[index]),
                  })),
                ]}
              />
            );
          }

          // If it's a regular response, just return it
          return response.content;
        }}
      </ChatCompletion>
    );
  },
);

// Main workflow
export const WeatherWorkflow = gsx.Component<{ query: string }>(
  "WeatherWorkflow",
  ({ query }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <WeatherBot query={query} />
      </OpenAIProvider>
    );
  },
);
