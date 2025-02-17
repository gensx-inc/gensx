import {
  GSXChatCompletion,
  GSXSchema,
  GSXTool,
  OpenAIProvider,
} from "@gensx/openai";
import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
} from "openai/resources/chat/completions.js";
import { Stream } from "openai/streaming";
import { z } from "zod";

// Define schemas at the top level
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

// Define weather schema and type
const weatherSchema = z.object({
  location: z.string(),
});
type WeatherParams = z.infer<typeof weatherSchema>;

const BasicCompletionWorkflow = gsx.Component<{}, ChatCompletionOutput>(
  "BasicCompletionWorkflow",
  () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
          },
          {
            role: "user",
            content: `What do you think of kubernetes in one paragraph?`,
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
      />
    </OpenAIProvider>
  ),
);

async function basicCompletion() {
  const wf = gsx.workflow("basicCompletion", BasicCompletionWorkflow);
  return await wf({});
}

// Define the tools workflow component
const ToolsWorkflow = gsx.Component<{}, ChatCompletionOutput>(
  "ToolsWorkflow",
  () => {
    // Create the tool with the correct type
    const tool = new GSXTool<typeof weatherSchema>(
      "get_weather",
      "get the weather for a given location",
      weatherSchema,
      async ({ location }: WeatherParams) => {
        console.log("getting weather for", location);
        const weather = ["sunny", "cloudy", "rainy", "snowy"];
        return Promise.resolve({
          weather: weather[Math.floor(Math.random() * weather.length)],
        });
      },
    );

    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXChatCompletion
          messages={[
            {
              role: "system",
              content:
                "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
            },
            {
              role: "user",
              content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
            },
          ]}
          model="gpt-4o-mini"
          temperature={0.7}
          tools={[tool]}
        />
      </OpenAIProvider>
    );
  },
);

async function tools() {
  const wf = gsx.workflow("tools", ToolsWorkflow);
  return wf({});
}

// Define the streaming tools workflow component
const ToolsStreamingWorkflow = gsx.Component<{}, Stream<ChatCompletionChunk>>(
  "ToolsStreamingWorkflow",
  () => {
    const tool = new GSXTool<typeof weatherSchema>(
      "get_weather",
      "get the weather for a given location",
      weatherSchema,
      async ({ location }: WeatherParams) => {
        console.log("getting weather for", location);
        const weather = ["sunny", "cloudy", "rainy", "snowy"];
        return Promise.resolve({
          weather: weather[Math.floor(Math.random() * weather.length)],
        });
      },
    );

    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXChatCompletion
          stream={true}
          messages={[
            {
              role: "system",
              content:
                "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
            },
            {
              role: "user",
              content: `What do you think of kubernetes in one paragraph? but also talk about the current weather. Make up a location and ask for the weather in that location from the tool.`,
            },
          ]}
          model="gpt-4o-mini"
          temperature={0.7}
          tools={[tool]}
        />
      </OpenAIProvider>
    );
  },
);

async function toolsStreaming() {
  const wf = gsx.workflow("toolsStreaming", ToolsStreamingWorkflow);
  return wf({});
}

const StreamingCompletionWorkflow = gsx.Component<
  {},
  Stream<ChatCompletionChunk>
>("StreamingCompletionWorkflow", () => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <GSXChatCompletion
      stream={true}
      messages={[
        {
          role: "system",
          content:
            "you are a trash eating infrastructure engineer embodied as a racoon. Be saassy and fun. ",
        },
        {
          role: "user",
          content: `What do you think of kubernetes in one paragraph?`,
        },
      ]}
      model="gpt-4o-mini"
      temperature={0.7}
    />
  </OpenAIProvider>
));

async function streamingCompletion() {
  const wf = gsx.workflow("streamingCompletion", StreamingCompletionWorkflow);
  return await wf({});
}

// Define the structured output workflow component
const StructuredOutputWorkflow = gsx.Component<
  {},
  z.infer<typeof trashRatingSchema>
>("StructuredOutputWorkflow", () => {
  const structuredOutput = new GSXSchema(trashRatingSchema);

  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun.",
          },
          {
            role: "user",
            content:
              "Rate and review three different trash bins in the neighborhood. Be creative with the locations!",
          },
        ]}
        model="gpt-4o-mini"
        temperature={0.7}
        outputSchema={structuredOutput}
      />
    </OpenAIProvider>
  );
});

async function structuredOutput() {
  const wf = gsx.workflow("structuredOutput", StructuredOutputWorkflow);
  return wf({});
}

// Define the multi-step tools workflow component
const MultiStepToolsWorkflow = gsx.Component<{}, ChatCompletionOutput>(
  "MultiStepToolsWorkflow",
  () => {
    const weatherTool = new GSXTool<typeof weatherSchema>(
      "get_weather",
      "Get the current weather for a location",
      weatherSchema,
      async ({ location }) => {
        console.log("Getting weather for", location);
        const weather = ["sunny", "cloudy", "rainy", "snowy"];
        return Promise.resolve({
          weather: weather[Math.floor(Math.random() * weather.length)],
        });
      },
    );

    const servicesSchema = z.object({
      service: z.enum(["restaurants", "parks", "cafes"]),
      location: z.string(),
    });

    const servicesTool = new GSXTool<typeof servicesSchema>(
      "find_local_services",
      "Find local services (restaurants, parks, or cafes) in a given location",
      servicesSchema,
      async ({ service, location }) => {
        console.log(`Finding ${service} near ${location}`);
        const places = {
          restaurants: ["Tasty Bites", "Gourmet Corner", "Local Flavor"],
          parks: ["Central Park", "Riverside Walk", "Community Garden"],
          cafes: ["Coffee Haven", "Bean Scene", "Morning Brew"],
        };
        return Promise.resolve({
          places: places[service].map((name) => ({
            name,
            rating: Math.floor(Math.random() * 2) + 4,
          })),
        });
      },
    );

    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXChatCompletion
          messages={[
            {
              role: "system",
              content:
                "You are a helpful local guide who provides detailed neighborhood analysis.",
            },
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
          model="gpt-4o-mini"
          temperature={0.7}
          tools={[weatherTool, servicesTool]}
        />
      </OpenAIProvider>
    );
  },
);

async function multiStepTools() {
  const wf = gsx.workflow("multiStepTools", MultiStepToolsWorkflow);
  return wf({});
}

async function main() {
  type Example =
    | "basicCompletion"
    | "streamingCompletion"
    | "tools"
    | "toolsStreaming"
    | "structuredOutput"
    | "multiStepTools";

  const example: Example = "multiStepTools";

  switch (example as Example) {
    case "basicCompletion": {
      console.log("basic completion 🔥");
      const r = await basicCompletion();
      console.log(r.choices[0].message.content);
      break;
    }
    case "streamingCompletion": {
      console.log("streaming completion 🔥");
      const stream = await streamingCompletion();
      for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0].delta.content ?? "");
      }
      break;
    }
    case "tools": {
      console.log("tools completion 🔥");
      const results = await tools();
      console.log(results.choices[0].message.content);
      break;
    }
    case "toolsStreaming": {
      console.log("tools streaming completion 🔥");
      const s2 = await toolsStreaming();
      for await (const chunk of s2) {
        process.stdout.write(chunk.choices[0].delta.content ?? "");
      }
      break;
    }
    case "structuredOutput": {
      console.log("structured output completion 🔥");
      const structured = await structuredOutput();
      console.log(structured.overallVerdict);
      console.log(structured);
      break;
    }
    case "multiStepTools": {
      console.log("multi-step tools completion 🔥");
      const multiStepResults = await multiStepTools();
      console.log(multiStepResults.choices[0].message.content);
      break;
    }
    default:
      throw new Error(`Unknown example: ${example}`);
  }
}

main().catch(console.error);
