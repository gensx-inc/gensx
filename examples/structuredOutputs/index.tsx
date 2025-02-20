import {
  ChatCompletion,
  GSXChatCompletion,
  OpenAIProvider,
} from "@gensx/openai";
import { gsx } from "gensx";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const ExtractEntitiesSchema = z.object({
  people: z.array(z.string()),
  places: z.array(z.string()),
  organizations: z.array(z.string()),
});

type ExtractEntitiesOutput = z.infer<typeof ExtractEntitiesSchema>;

interface ExtractEntitiesProps {
  text: string;
}

const ExtractEntities = gsx.Component<
  ExtractEntitiesProps,
  ExtractEntitiesOutput
>("ExtractEntities", ({ text }) => {
  const prompt = `Please review the following text and extract all the people, places, and organizations mentioned.

  <text>
  ${text}
  </text>

  Please return json with the following format:
  {
    "people": ["person1", "person2", "person3"],
    "places": ["place1", "place2", "place3"],
    "organizations": ["org1", "org2", "org3"]
  }`;
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <GSXChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "user",
            content: prompt,
          },
        ]}
        outputSchema={ExtractEntitiesSchema}
      />
    </OpenAIProvider>
  );
});

const ExtractEntitiesWithoutHelpers = gsx.Component<
  ExtractEntitiesProps,
  ExtractEntitiesOutput
>("ExtractEntitiesWithoutHelpers", ({ text }) => {
  const prompt = `Please review the following text and extract all the people, places, and organizations mentioned.

  <text>
  ${text}
  </text>

  Please return json with the following format:
  {
    "people": ["person1", "person2", "person3"],
    "places": ["place1", "place2", "place3"],
    "organizations": ["org1", "org2", "org3"]
  }`;
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "user",
            content: prompt,
          },
        ]}
        response_format={zodResponseFormat(ExtractEntitiesSchema, "entities")}
      >
        {(response: string) => {
          return ExtractEntitiesSchema.parse(JSON.parse(response));
        }}
      </ChatCompletion>
    </OpenAIProvider>
  );
});

async function main() {
  console.log("\n🚀 Starting the structured outputs example");

  console.log("\n🎯 Getting structured outputs with GSXChatCompletion");
  const workflow = gsx.Workflow("ExtractEntities", ExtractEntities);
  const result = await workflow.run(
    {
      text: "John Doe is a software engineer at Google.",
    },
    { printUrl: true },
  );
  console.log(result);

  console.log("\n🎯 Getting structured outputs without helpers");
  const workflowWithoutHelpers = gsx.Workflow(
    "ExtractEntitiesWithoutHelpers",
    ExtractEntitiesWithoutHelpers,
  );
  const resultWithoutHelpers = await workflowWithoutHelpers.run(
    {
      text: "John Doe is a software engineer at Google.",
    },
    { printUrl: true },
  );
  console.log(resultWithoutHelpers);
  console.log("\n✅ Structured outputs example complete");
}

main().catch(console.error);
