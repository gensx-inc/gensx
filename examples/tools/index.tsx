import {
  GSXTool,
  OpenAIChatCompletion,
  OpenAIChatCompletionOutput,
  OpenAIProvider,
  ToolExecutor,
} from "@gensx/openai";
import { gsx } from "gensx";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions.mjs";
import { z } from "zod";

interface VanillaToolsProps {
  text: string;
}

// Weather tool (reusing existing schema)
const weatherSchema = z.object({
  location: z.string(),
});

const weatherTool = new GSXTool<typeof weatherSchema>(
  "get_weather",
  "Get the current weather for a location",
  weatherSchema,
  async ({ location }) => {
    console.log("Getting weather for", location);
    // Simulate API delay
    const weather = ["sunny", "cloudy", "rainy", "snowy"];
    return Promise.resolve({
      weather: weather[Math.floor(Math.random() * weather.length)],
    });
  },
);

// Define the more advanced version of the component using zod
const VanillaTools = gsx.Component<VanillaToolsProps, string>(
  "WeatherBoy",
  ({ text }) => {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You are a chilly weather assistant",
      },
      { role: "user", content: text },
    ];
    return (
      <OpenAIChatCompletion
        model="gpt-4o-mini"
        messages={messages}
        tools={[weatherTool]}
        stream={false}
      >
        {(response: OpenAIChatCompletionOutput) => (
          <ToolExecutor
            tools={[weatherTool]}
            toolCalls={response.choices[0].message?.tool_calls ?}
            messages={messages}
            model="gpt-4o-mini"
          />
        )}
      </OpenAIChatCompletion>
    );
  },
);

async function main() {
  console.log("\n🚀 Starting the vanilla tools example");

  const result = await gsx.execute(
    <OpenAIProvider
      apiKey={process.env.OPENAI_API_KEY}
      componentOpts={{ name: "VanillaTools" }}
    >
      <VanillaTools text="What's the weather in Tokyo?" />
    </OpenAIProvider>,
  );
  console.log(result);
  console.log("\n✅ Vanilla tools example complete");
}

main().catch(console.error);
