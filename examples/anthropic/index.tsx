import {
  Message,
  RawMessageStreamEvent,
} from "@anthropic-ai/sdk/resources/messages";
import { Stream } from "@anthropic-ai/sdk/streaming.mjs";
import {
  AnthropicChatCompletion,
  AnthropicProvider,
  GSXChatCompletion,
  GSXChatCompletionResult,
  GSXTool,
} from "@gensx/anthropic";
import { gsx } from "gensx";
import { z } from "zod";

function basicCompletion() {
  const BasicCompletionExample = gsx.Component<{}, Message>(
    "BasicCompletionExample",
    () => (
      <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
        <AnthropicChatCompletion
          system="you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. "
          messages={[
            {
              role: "user",
              content: `What do you think of kubernetes in one paragraph?`,
            },
          ]}
          model="claude-3-5-sonnet-latest"
          temperature={0.7}
          stream={false}
          max_tokens={1000}
        />
      </AnthropicProvider>
    ),
  );

  const workflow = gsx.Workflow(
    "BasicCompletionExampleWorkflow",
    BasicCompletionExample,
  );

  return workflow.run({}, { printUrl: true });
}

function tools() {
  // Define the schema as a Zod object
  const weatherSchema = z.object({
    location: z.string(),
  });

  // Use z.infer to get the type for our parameters
  type WeatherParams = z.infer<typeof weatherSchema>;

  // Create the tool with the correct type - using the schema type, not the inferred type
  const tool = new GSXTool({
    name: "get_weather",
    description: "get the weather for a given location",
    schema: weatherSchema,
    run: async ({ location }: WeatherParams) => {
      console.log("getting weather for", location);
      const weather = ["sunny", "cloudy", "rainy", "snowy"];
      return Promise.resolve({
        weather: weather[Math.floor(Math.random() * weather.length)],
      });
    },
  });

  const ToolsExample = gsx.Component<{}, Message>("ToolsExample", () => (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
      <GSXChatCompletion
        system="you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. "
        messages={[
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
          },
        ]}
        model="claude-3-5-sonnet-latest"
        temperature={0.7}
        max_tokens={1000}
        tools={[tool]}
      />
    </AnthropicProvider>
  ));

  const workflow = gsx.Workflow("ToolsExampleWorkflow", ToolsExample);

  return workflow.run({}, { printUrl: true });
}

// function toolsStreaming() {
//   // Define the schema as a Zod object
//   const weatherSchema = z.object({
//     location: z.string(),
//   });

//   // Use z.infer to get the type for our parameters
//   type WeatherParams = z.infer<typeof weatherSchema>;

//   // Create the tool with the correct type - using the schema type, not the inferred type
//   const tool = new GSXTool({
//     name: "get_weather",
//     description: "get the weather for a given location",
//     schema: weatherSchema,
//     run: async ({ location }: WeatherParams) => {
//       console.log("getting weather for", location);
//       const weather = ["sunny", "cloudy", "rainy", "snowy"];
//       return Promise.resolve({
//         weather: weather[Math.floor(Math.random() * weather.length)],
//       });
//     },
//   });

//   const ToolsStreamingExample = gsx.Component<
//     {},
//     Stream<RawMessageStreamEvent>
//   >("ToolsStreamingExample", () => (
//     <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
//       <GSXChatCompletion
//         stream={true}
//         system="you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. "
//         messages={[
//           {
//             role: "user",
//             content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
//           },
//         ]}
//         model="claude-3-5-sonnet-latest"
//         temperature={0.7}
//         max_tokens={1000}
//         tools={[tool]}
//       />
//     </AnthropicProvider>
//   ));

//   const workflow = gsx.Workflow(
//     "ToolsStreamingWorkflow",
//     ToolsStreamingExample,
//   );

//   return workflow.run({}, { printUrl: true });
// }

function streamingCompletion() {
  const StreamingCompletionWorkflow = gsx.Component<
    {},
    Stream<RawMessageStreamEvent>
  >("StreamingCompletionWorkflow", () => (
    <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
      <GSXChatCompletion
        stream={true}
        system="you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. "
        messages={[
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph?`,
          },
        ]}
        model="claude-3-5-sonnet-latest"
        temperature={0.7}
        max_tokens={1000}
      />
    </AnthropicProvider>
  ));

  const workflow = gsx.Workflow(
    "StreamingCompletionWorkflow",
    StreamingCompletionWorkflow,
  );

  return workflow.run({}, { printUrl: true });
}

function structuredOutput() {
  // Define a schema for rating trash bins
  const trashRatingSchema = z.object({
    bins: z.array(
      z.object({
        location: z.string().describe("Location of the trash bin"),
        rating: z.number().describe("Rating from 1-10"),
        review: z.string().describe("A sassy review of the trash bin"),
        bestFinds: z
          .array(z.string())
          .describe("List of the best items found in this bin"),
      }),
    ),
    overallVerdict: z
      .string()
      .describe("Overall verdict on the neighborhood's trash quality"),
  });

  type TrashRating = z.infer<typeof trashRatingSchema>;

  const StructuredOutputWorkflow = gsx.Component<{}, TrashRating>(
    "StructuredOutputWorkflow",
    () => (
      <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
        <GSXChatCompletion
          system="you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun."
          messages={[
            {
              role: "user",
              content:
                "Rate and review three different trash bins in the neighborhood. Be creative with the locations!",
            },
          ]}
          model="claude-3-5-sonnet-latest"
          temperature={0.7}
          max_tokens={1000}
          outputSchema={trashRatingSchema}
        />
      </AnthropicProvider>
    ),
  );

  const workflow = gsx.Workflow(
    "StructuredOutputWorkflow",
    StructuredOutputWorkflow,
  );

  return workflow.run({}, { printUrl: true });
}

function multiStepTools() {
  // Weather tool (reusing existing schema)
  const weatherSchema = z.object({
    location: z.string(),
  });

  const weatherTool = new GSXTool({
    name: "get_weather",
    description: "Get the current weather for a location",
    schema: weatherSchema,
    run: async ({ location }) => {
      console.log("Getting weather for", location);
      // Simulate API delay
      const weather = ["sunny", "cloudy", "rainy", "snowy"];
      return Promise.resolve({
        weather: weather[Math.floor(Math.random() * weather.length)],
      });
    },
  });

  // Local services tool
  const servicesSchema = z.object({
    service: z.enum(["restaurants", "parks", "cafes"]),
    location: z.string(),
  });

  const servicesTool = new GSXTool({
    name: "find_local_services",
    description:
      "Find local services (restaurants, parks, or cafes) in a given location",
    schema: servicesSchema,
    run: async ({ service, location }) => {
      console.log(`Finding ${service} near ${location}`);
      // Simulate API delay
      const places = {
        restaurants: ["Tasty Bites", "Gourmet Corner", "Local Flavor"],
        parks: ["Central Park", "Riverside Walk", "Community Garden"],
        cafes: ["Coffee Haven", "Bean Scene", "Morning Brew"],
      };
      return Promise.resolve({
        places: places[service].map((name) => ({
          name,
          rating: Math.floor(Math.random() * 2) + 4, // 4-5 star rating
        })),
      });
    },
  });

  const MultiStepToolsWorkflow = gsx.Component<{}, GSXChatCompletionResult>(
    "MultiStepToolsWorkflow",
    () => (
      <AnthropicProvider apiKey={process.env.ANTHROPIC_API_KEY}>
        <GSXChatCompletion
          system="you are a helpful local guide who provides detailed neighborhood analysis."
          messages={[
            {
              role: "user",
              content: `I'm thinking of spending a day in downtown Seattle. Can you:
1. Check the weather first
2. Based on the weather, suggest some activities (use the local services tool)
3. If it's good weather, look for parks and outdoor dining
4. If it's bad weather, focus on indoor places like cafes and restaurants
Please explain your thinking as you go through this analysis.`,
            },
          ]}
          model="claude-3-5-sonnet-latest"
          temperature={0.7}
          max_tokens={1000}
          tools={[weatherTool, servicesTool]}
        />
      </AnthropicProvider>
    ),
  );

  const workflow = gsx.Workflow(
    "MultiStepToolsWorkflow",
    MultiStepToolsWorkflow,
  );

  return workflow.run({}, { printUrl: true });
}

async function main() {
  type Example =
    | "basicCompletion"
    | "streamingCompletion"
    | "tools"
    | "toolsStreaming"
    | "structuredOutput"
    | "multiStepTools";

  const example: Example = "structuredOutput";

  switch (example as Example) {
    case "basicCompletion":
      console.log("basic completion 🔥");
      const r = await basicCompletion();
      console.log(r.content);
      break;
    case "streamingCompletion":
      console.log("streaming completion 🔥");
      const stream = await streamingCompletion();
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          process.stdout.write(chunk.delta.text);
        }
      }
      break;

    case "tools":
      console.log("tools completion 🔥");
      const results = await tools();
      console.log(JSON.stringify(results, null, 2));
      break;

    // case "toolsStreaming":
    //   console.log("tools streaming completion 🔥");
    //   const s2 = await toolsStreaming();
    //   for await (const chunk of s2) {
    //     process.stdout.write(chunk.choices[0].delta.content ?? "");
    //   }
    //   break;

    case "structuredOutput":
      console.log("structured output completion 🔥");
      const structured = await structuredOutput();
      console.log(structured.overallVerdict);
      console.log(structured);
      break;

    case "multiStepTools":
      console.log("multi-step tools completion 🔥");
      const multiStepResults = await multiStepTools();
      console.log(JSON.stringify(multiStepResults, null, 2));
      break;

    default:
      throw new Error(`Unknown example: ${example}`);
  }
}

main().catch(console.error);
