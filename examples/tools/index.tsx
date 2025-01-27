import { gsx } from "gensx";
import { ChatCompletion } from "gensx-openai";
import { z } from "zod";

const EchoSchema = z.object({
  message: z.string().describe("The message to echo back"),
});

type EchoParams = z.infer<typeof EchoSchema>;

const EchoTool = gsx.Tool<typeof EchoSchema, string>({
  name: "echo",
  description: "Echoes back the message you send",
  schema: EchoSchema,
  function: async (params: EchoParams) => {
    console.log("Echo tool called with:", params);
    return `Echo: ${params.message}`;
  },
});

const GetWeatherSchema = z.object({
  location: z.string().describe("The city and state or country"),
});

type GetWeatherProps = z.infer<typeof GetWeatherSchema>;

interface GetWeatherResponse {
  temperature: number;
  conditions: string;
}

// The params will be inferred from GetWeatherSchema
const getWeatherTool = gsx.Tool<typeof GetWeatherSchema, GetWeatherResponse>({
  name: "getWeather",
  description: "Get the current weather for a location",
  schema: GetWeatherSchema,
  function: async (params: GetWeatherProps) => {
    // params.location is now properly typed as string
    console.log("Getting weather for:", params);
    return {
      temperature: 72,
      conditions: "sunny",
    };
  },
});

interface ToolExampleProps {
  message: string;
}

const BasicToolResponseExample = gsx.Component<
  ToolExampleProps,
  GetWeatherResponse | string
>("BasicToolResponseExample", (props) => {
  return (
    <ChatCompletion
      model="gpt-4o-mini"
      tools={[getWeatherTool]}
      messages={[
        {
          role: "system",
          content:
            "You are a helpful weather assistant. Use the getWeather tool when asked about weather.",
        },
        { role: "user", content: props.message },
      ]}
      //gsxExecuteTools={true}
    />
  );
});

async function main() {
  console.log("\n🔊 Testing echo tool...");

  // Test direct function call
  const result1 = await EchoTool({ message: "Hello direct!" });
  console.log("Direct call result:", result1);

  // Test JSX usage
  const result2 = await gsx.execute(<EchoTool message="Hello JSX!" />);
  console.log("JSX call result:", result2);

  // Test a tool with a chat completion with a tool response
  const chatResult = await gsx.execute(
    <BasicToolResponseExample message="What is the weather in San Francisco?" />,
  );
  console.log("Chat completion result:", chatResult);

  // Test a tool with a chat completion with a tool response
  const chatResult2 = await gsx.execute(
    <BasicToolResponseExample message="Hello" />,
  );
  console.log("Chat completion result:", chatResult2);

  // Log the OpenAPI schema
  //console.log("\nTool schema:", EchoTool.getOpenApiSchema());
}

main().catch(console.error);
