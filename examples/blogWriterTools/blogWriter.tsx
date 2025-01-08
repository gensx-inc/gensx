import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";
import { Tool, ToolAgent } from "./tools.js";

interface BlogWriterProps {
  prompt: string;
}

const researchTool: Tool = {
  name: "research",
  description:
    "Research a specific topic and return a summary of findings. You may call this tool multiple times with different topics.",
  schema: `{
    "topic": "string - The topic to research"
  }`,
  call: async (input) => {
    console.log("📚 Researching topic:", input.topic);
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          {
            role: "system",
            content:
              "You are a research assistant. Summarize key points about the topic in 2-3 sentences.",
          },
          { role: "user", content: input.topic },
        ]}
      />
    );
  },
};

const writeTool: Tool = {
  name: "write",
  description: "Write a blog post based on research and a prompt",
  schema: `{
    "research": "string - The research findings to base the blog post on",
    "prompt": "string - The original writing prompt"
  }`,
  call: async (input) => {
    console.log("✍️ Writing blog post based on research");
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0.7}
        messages={[
          {
            role: "system",
            content:
              "You are a blog post writer. Write a 300-word blog post using the provided research and prompt.",
          },
          {
            role: "user",
            content: `Research:\n${input.research}\n\nPrompt: ${input.prompt}`,
          },
        ]}
      />
    );
  },
};

const editTool: Tool = {
  name: "edit",
  description: "Edit and improve a blog post draft",
  schema: `{
    "draft": "string - The blog post draft to edit"
  }`,
  call: async (input) => {
    console.log("✨ Editing blog post");
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0.5}
        messages={[
          {
            role: "system",
            content:
              "You are an editor. Improve the draft by making it more engaging and polished, while preserving the key points.",
          },
          { role: "user", content: input.draft },
        ]}
      />
    );
  },
};

export const BlogWriter = gsx.Component<BlogWriterProps, string>(
  async ({ prompt }) => {
    console.log("🔧 Starting blog writing workflow");

    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <ToolAgent
          input={`Write a blog post about: ${prompt}. First research the topic, then write a draft, then edit the draft, then return the final blog post.`}
          tools={[researchTool, writeTool, editTool]}
        />
      </OpenAIProvider>
    );
  },
);
