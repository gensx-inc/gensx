import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "gensx";

interface BrainstormTopicsProps {
  prompt: string;
}
interface BrainstormTopicsOutput {
  topics: string[];
}
const BrainstormTopics = gsx.Component<
  BrainstormTopicsProps,
  BrainstormTopicsOutput
>("BrainstormTopics", ({ prompt }) => {
  console.log("🔍 Starting research for:", prompt);
  const systemPrompt = `You are a helpful assistant that brainstorms topics for a researching a blog post. The user will provide a prompt and you will brainstorm topics based on the prompt. You should return 3 - 5 topics, as a JSON array.

Here is an example of the JSON output: { "topics": ["topic 1", "topic 2", "topic 3"] }`;
  return (
    <ChatCompletion
      model="gpt-4o-mini"
      temperature={0.5}
      messages={[
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]}
      response_format={{ type: "json_object" }}
    >
      {
        // TODO: Figure out why this needs a type annotation, but other components do not.
        (completion: string | null) =>
          JSON.parse(completion ?? '{ "topics": [] }')
      }
    </ChatCompletion>
  );
});

interface ResearchTopicProps {
  topic: string;
}
type ResearchTopicOutput = string;
const ResearchTopic = gsx.Component<ResearchTopicProps, ResearchTopicOutput>(
  "ResearchTopic",
  ({ topic }) => {
    console.log("📚 Researching topic:", topic);
    const systemPrompt = `You are a helpful assistant that researches topics. The user will provide a topic and you will research the topic. You should return a summary of the research, summarizing the most important points in a few sentences at most.`;

    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          { role: "system", content: systemPrompt },
          { role: "user", content: topic },
        ]}
      />
    );
  },
);

interface WriteDraftProps {
  research: string[];
  prompt: string;
}
type WriteDraftOutput = string;
const WriteDraft = gsx.Component<WriteDraftProps, WriteDraftOutput>(
  "WriteDraft",
  ({ prompt, research }) => {
    const systemPrompt = `You are a helpful assistant that writes blog posts. The user will provide a prompt and you will write a blog post based on the prompt. Unless specified by the user, the blog post should be 200 words.

Here is the research for the blog post: ${research.join("\n")}`;

    console.log("🚀 Writing blog post for:", { prompt, research });
    return (
      <ChatCompletion
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ]}
      />
    );
  },
);

interface EditDraftProps {
  draft: string;
}
const EditDraft = gsx.StreamComponent<EditDraftProps>(
  "EditDraft",
  ({ draft }) => {
    console.log("🔍 Editing draft");
    const systemPrompt = `You are a helpful assistant that edits blog posts. The user will provide a draft and you will edit it to make it more engaging and interesting.`;

    return (
      <ChatCompletion
        stream={true}
        model="gpt-4o-mini"
        temperature={0}
        messages={[
          { role: "system", content: systemPrompt },
          { role: "user", content: draft },
        ]}
      />
    );
  },
);

interface SearchWebProps {
  prompt: string;
}
type SearchWebOutput = string[];
export const SearchWeb = gsx.Component<SearchWebProps, SearchWebOutput>(
  "SearchWeb",
  async ({ prompt }) => {
    console.log("🌐 Researching web for:", prompt);
    const results = await Promise.resolve([
      "web result 1",
      "web result 2",
      "web result 3",
    ]);
    return results;
  },
);

type ResearchOutput = [string[], string[]];
interface ResearchProps {
  prompt: string;
}
const Research = gsx.Component<ResearchProps, ResearchOutput>(
  "Research",
  ({ prompt }) => {
    return (
      <>
        <BrainstormTopics prompt={prompt}>
          {({ topics }) => {
            return topics.map((topic) => <ResearchTopic topic={topic} />);
          }}
        </BrainstormTopics>
        <SearchWeb prompt={prompt} />
      </>
    );
  },
);

interface BlogWriterProps {
  prompt: string;
}

export const WriteBlog = gsx.StreamComponent<BlogWriterProps>(
  "WriteBlog",
  ({ prompt }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <Research prompt={prompt}>
          {(research) => (
            <WriteDraft prompt={prompt} research={research.flat()}>
              {(draft) => <EditDraft draft={draft} stream={true} />}
            </WriteDraft>
          )}
        </Research>
      </OpenAIProvider>
    );
  },
);
