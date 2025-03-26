import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIEmbedding, OpenAIProvider } from "@gensx/openai";
import { z } from "zod";

import { useVectorDB, VectorDBProvider } from "./providers/vectorDb.js";

// This is a simple translator that uses a vector DB to look up translations for phrases and return them to the user.
// If the statement is not found in the vector DB, it will be translated using a LLM.
const QueryForChunks = gensx.Component<{ query: string }, { chunks: string[] }>(
  "QueryForDocs",
  async ({ query }) => {
    const { search } = useVectorDB();

    const embeddings = await OpenAIEmbedding.run({
      input: query,
      model: "text-embedding-3-small",
    });

    const chunks = await search(embeddings.data[0].embedding, { topK: 5 });

    return {
      chunks: chunks.map((chunk) => chunk.item.metadata.text as string),
    };
  },
);

const Agent = gensx.Component<
  { query: string; initialChunks: string[] },
  string
>("Agent", ({ query, initialChunks }) => {
  const systemPrompt = `
    You are a helpful assistant that can translate text from English to NüLang. This language is a purely written language, that uses a combination of emojis and phonetic symbols to represent words.

You have access to a translation-guide-examples tool. Use this tool to search for examples of how to translate text from English to NüLang.

${
  initialChunks.length > 0
    ? `Here are some relevant examples of how to translate text from English to NüLang: ${initialChunks.join("\n\n")}

If you think this is not enough information, you can use the translation guide tool to get more information and a better understanding of the language.
If the guide does not return a relevant translation, you should query it for instructions on how to translate phrases related to the user's query.
`
    : ""
}
    `;

  return (
    <ChatCompletion
      model="gpt-4o-mini"
      messages={[
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ]}
      tools={[TranslationGuideExamplesTool]}
    />
  );
});

const TranslationGuideSchema = z.object({
  query: z.string().describe("The phrase to search for in the guide."),
});

const TranslationGuideExamplesTool: gensx.GSXToolProps<
  typeof TranslationGuideSchema
> = {
  name: "translation-guide-examples",
  description:
    "Use this tool to search for relevant examples of how to translate text from English to NüLang.",
  schema: TranslationGuideSchema,
  run: async ({ query }) => {
    const { chunks } = await QueryForChunks.run({ query });
    return chunks.join("\n\n");
  },
};

const NuLangTranslator = gensx.Component<{ query: string }, string>(
  "NuLangTranslator",
  ({ query }) => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <VectorDBProvider indexName="docs">
        <QueryForChunks query={query}>
          {({ chunks }) => <Agent query={query} initialChunks={chunks} />}
        </QueryForChunks>
      </VectorDBProvider>
    </OpenAIProvider>
  ),
);

export const NuLangTranslatorWorkflow = gensx.Workflow(
  "NuLangTranslatorWorkflow",
  NuLangTranslator,
);
