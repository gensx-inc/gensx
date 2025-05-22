import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";
import { zodFunction } from "openai/helpers/zod.mjs";
import { z } from "zod";

const openai = new OpenAI();

interface BrainstormTopicsProps {
  prompt: string;
}
interface BrainstormTopicsOutput {
  topics: string[];
}

@gensx.Component()
async function BrainstormTopics({ prompt }: BrainstormTopicsProps) {
  console.log("🔍 Starting research for:", prompt);
  const systemPrompt = `You are a helpful assistant that brainstorms topics for a researching a blog post. The user will provide a prompt and you will brainstorm topics based on the prompt. You should return 3 - 5 topics, as a JSON array.

Here is an example of the JSON output: { "topics": ["topic 1", "topic 2", "topic 3"] }`;
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  return JSON.parse(result.choices[0].message.content ?? "{}") as BrainstormTopicsOutput;
}

interface ResearchTopicProps {
  topic: string;
}
type ResearchTopicOutput = string;

@gensx.Component()
async function ResearchTopic({ topic }: ResearchTopicProps) {
  console.log("📚 Researching topic:", topic);
  const systemPrompt = `You are a helpful assistant that researches topics. The user will provide a topic and you will call the research tool to get the research. And then return a summary of the research, summarizing the most important points in a few sentences at most.`;
  const runner = await openai.beta.chat.completions.runTools({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: topic },
    ],
    tools: [
      zodFunction({
        name: "research",
        description: "Research a topic",
        parameters: z.object({
          topic: z.string(),
        }),
        function: (args: { topic: string }) => {
          console.log("🔍 Research tool:", args.topic);
          return `You researched the topic ${args.topic} and found the following: ${args.topic}`;
        },
      }),
    ],
  });

  console.log("🔍 Researching topic:", topic);

  return (await runner.finalContent()) ?? "";
}

interface WriteDraftProps {
  research: string[];
  prompt: string;
}
type WriteDraftOutput = string;

@gensx.Component()
async function WriteDraft({ prompt, research }: WriteDraftProps) {
  const systemPrompt = `You are a helpful assistant that writes blog posts. The user will provide a prompt and you will write a blog post based on the prompt. Unless specified by the user, the blog post should be 200 words.

Here is the research for the blog post: ${research.join("\n")}`;

  console.log("🚀 Writing blog post for:", { prompt, research });
  const result = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });
  return result.choices[0].message.content ?? "";
}

interface EditDraftProps {
  draft: string;
}

@gensx.Component()
async function EditDraft({ draft }: EditDraftProps) {
  console.log("🔍 Editing draft");
  const systemPrompt = `You are a helpful assistant that edits blog posts. The user will provide a draft and you will edit it to make it more engaging and interesting.`;

  const result = await openai.chat.completions.create({
    stream: true,
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: draft },
    ],
  });

  const generator = async function* () {
    for await (const chunk of result) {
      yield chunk.choices[0].delta.content ?? "";
    }
  };
  return generator();
}

interface SearchWebProps {
  prompt: string;
}
type SearchWebOutput = string[];

@gensx.Component()
async function SearchWeb({ prompt }: SearchWebProps) {
    console.log("🌐 Researching web for:", prompt);
    const results = await Promise.resolve([
      "web result 1",
      "web result 2",
    "web result 3",
  ]);
  return results;
}

type ResearchOutput = [string[], string[]];
interface ResearchProps {
  prompt: string;
}

@gensx.Component()
async function Research({ prompt }: ResearchProps) {
  const brainstorm = await BrainstormTopics({ prompt });

  const research = await Promise.all(
    brainstorm.topics.map((topic) => ResearchTopic({ topic })),
  );
  return [research, brainstorm.topics];
}

interface BlogWriterProps {
  prompt: string;
}

@gensx.Workflow()
async function WriteBlogWorkflow({ prompt }: BlogWriterProps) {
  const research = await Research({ prompt });
  const draft = await WriteDraft({ prompt, research: research.flat() });
  const editedDraft = await EditDraft({ draft });
  return editedDraft;
}

export { WriteBlogWorkflow };
