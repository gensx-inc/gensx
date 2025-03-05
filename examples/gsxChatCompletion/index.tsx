import * as gensx from "@gensx/core";
import {
  GSXChatCompletion,
  GSXChatCompletionResult,
  GSXTool,
  OpenAIProvider,
} from "@gensx/openai";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionChunk,
} from "openai/resources/chat/completions.js";
import { Stream } from "openai/streaming";
import { z } from "zod";

function basicCompletion() {
  const BasicCompletionExample = gensx.Component<{}, ChatCompletionOutput>(
    "BasicCompletionExample",
    () => (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXChatCompletion
          messages={[
            {
              role: "system",
              content:
                "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
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

  const workflow = gensx.Workflow(
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

  const ToolsExample = gensx.Component<{}, ChatCompletionOutput>(
    "ToolsExample",
    () => (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <GSXChatCompletion
          messages={[
            {
              role: "system",
              content:
                "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
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
    ),
  );

  const workflow = gensx.Workflow("ToolsExampleWorkflow", ToolsExample);

  return workflow.run({}, { printUrl: true });
}

function toolsStreaming() {
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

  const ToolsStreamingExample = gensx.Component<
    {},
    Stream<ChatCompletionChunk>
  >("ToolsStreamingExample", () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        stream={true}
        messages={[
          {
            role: "system",
            content:
              "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
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
  ));

  const workflow = gensx.Workflow(
    "ToolsStreamingWorkflow",
    ToolsStreamingExample,
  );

  return workflow.run({}, { printUrl: true });
}

function streamingCompletion() {
  const StreamingCompletionWorkflow = gensx.Component<
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
              "you are a trash eating infrastructure engineer embodied as a racoon. Be sassy and fun. ",
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

  const workflow = gensx.Workflow(
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

  const StructuredOutputWorkflow = gensx.Component<{}, TrashRating>(
    "StructuredOutputWorkflow",
    () => (
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
          outputSchema={trashRatingSchema}
        />
      </OpenAIProvider>
    ),
  );

  const workflow = gensx.Workflow(
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

  const MultiStepToolsWorkflow = gensx.Component<{}, GSXChatCompletionResult>(
    "MultiStepToolsWorkflow",
    () => (
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
    ),
  );

  const workflow = gensx.Workflow(
    "MultiStepToolsWorkflow",
    MultiStepToolsWorkflow,
  );

  return workflow.run({}, { printUrl: true });
}

function toolsWithStructuredOutput() {
  // Trash details tool
  const trashDetailsSchema = z.object({
    name: z.string(),
  });

  const trashDetailsTool = new GSXTool({
    name: "get_trash_details",
    description: "Get details on trash bins by name",
    schema: trashDetailsSchema,
    run: async ({ name }) => {
      console.log("Getting details for the trash bin called", name);

      // Array of possible funny reviews
      const possibleReviews = [
        "Five stars! The metallic finish really complements my night vision goggles.",
        "This bin has the perfect height-to-tip ratio. Trust me, I'm a professional.",
        "The lid squeaks just right - nature's dinner bell!",
        "Premium dining establishment with excellent late-night service.",
        "The vintage 2023 garbage collection is *chef's kiss*.",
        "A bit pretentious for my taste, but the food scraps are to die for.",
        "Best dumpster in the neighborhood, but don't tell the other raccoons!",
      ];

      // Array of possible trash finds
      const possibleFinds = [
        "half-eaten avocado toast",
        "vintage pizza crust (2 days old)",
        "artisanal coffee grounds",
        "slightly used takeout container",
        "premium banana peel",
        "gourmet sandwich wrapper",
        "fancy aluminum foil ball",
        "organic vegetable peels",
        "designer paper bag",
        "boutique cardboard box",
        "locally-sourced leftovers",
        "free-range chicken bones",
        "sustainable food scraps",
      ];

      // Generate random rating between 3.5 and 5
      const rating = (Math.random() * 1.5 + 3.5).toFixed(1);

      // Get random review
      const review =
        possibleReviews[Math.floor(Math.random() * possibleReviews.length)];

      // Get 2-4 random unique finds
      const numFinds = Math.floor(Math.random() * 3) + 2;
      const shuffledFinds = [...possibleFinds].sort(() => Math.random() - 0.5);
      const bestFinds = shuffledFinds.slice(0, numFinds);

      const trashDetails = {
        name,
        rating: parseFloat(rating),
        review,
        bestFinds,
      };
      return Promise.resolve(trashDetails);
    },
  });

  // Define a schema for rating trash bins
  const trashBinReportSchema = z.object({
    highlights: z.array(
      z.object({
        location: z
          .string()
          .describe("Location of the trash bin being highlighted"),
        commentary: z
          .string()
          .describe(
            "A brief description of why the bin is a highlight and why it's a good bin",
          ),
        bestFinds: z
          .array(z.string())
          .describe("List of the best items found in this bin"),
      }),
    ),
    binOfTheWeek: z.string().describe("The best trash bin in the neighborhood"),
  });

  type TrashBinReport = z.infer<typeof trashBinReportSchema>;

  const ToolsWithStructuredOutputWorkflow = gensx.Component<{}, TrashBinReport>(
    "ToolsWithStructuredOutputWorkflow",
    () => (
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
              content: `Please research the trash bins in the neighborhood and then create a report on the best trash bins in the neighborhood. be controversial`,
            },
          ]}
          model="gpt-4o-mini"
          temperature={0.7}
          tools={[trashDetailsTool]}
          outputSchema={trashBinReportSchema}
        />
      </OpenAIProvider>
    ),
  );

  const workflow = gensx.Workflow(
    "ToolsWithStructuredOutputWorkflow",
    ToolsWithStructuredOutputWorkflow,
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
    | "multiStepTools"
    | "toolsWithStructuredOutput";

  const example: Example = "toolsWithStructuredOutput";

  switch (example as Example) {
    case "basicCompletion":
      console.log("basic completion 🔥");
      const r = await basicCompletion();
      console.log(r.choices[0].message.content);
      break;
    case "streamingCompletion":
      console.log("streaming completion 🔥");
      const stream = await streamingCompletion();
      for await (const chunk of stream) {
        process.stdout.write(chunk.choices[0].delta.content ?? "");
      }
      break;

    case "tools":
      console.log("tools completion 🔥");
      const results = await tools();
      console.log(results.choices[0].message.content);
      break;

    case "toolsStreaming":
      console.log("tools streaming completion 🔥");
      const s2 = await toolsStreaming();
      for await (const chunk of s2) {
        process.stdout.write(chunk.choices[0].delta.content ?? "");
      }
      break;

    case "structuredOutput":
      console.log("structured output completion 🔥");
      const structured = await structuredOutput();
      console.log(structured.overallVerdict);
      console.log(structured);
      break;

    case "multiStepTools":
      console.log("multi-step tools completion 🔥");
      const multiStepResults = await multiStepTools();
      console.log(multiStepResults.choices[0].message.content);
      break;

    case "toolsWithStructuredOutput":
      console.log("tools with structured output ���");
      const result = await toolsWithStructuredOutput();
      console.log(JSON.stringify(result, null, 2));
      break;

    default:
      throw new Error(`Unknown example: ${example}`);
  }
}

main().catch(console.error);
