import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

interface ExtractSnippetInput {
  researchBrief: string;
  query: string;
  content: string;
}

export const ExtractSnippet = gensx.Component(
  "ExtractSnippet",
  async ({ researchBrief, query, content }: ExtractSnippetInput) => {
    if (content === "") {
      return "";
    }

    const systemMessage = "You are an experienced research assistant.";

    const fullPrompt = `Below is a the content from a search result along with the the search query used to retrieve it and the research brief for a report I'm writing.

Please extract a short snippet from the document relevant to the search query and research brief.


Instructions:
- The goal of the snippet is to provide an interesting or useful fact or insight from the search result that is relevant to the research brief and query.
- The snippet should represent one of the key ideas or insights from the search result.
- The snippet should make sense to a reader looking at it given the research brief and query.
- Prefer interesting sentences over more generic ones
- Extract the sentence verbatim - no paraphrasing or rephrasing. Fixing formatting is fine.
- Snippets should be one sentence long or shorter.
- If there isn't any useful snippets, return "No useful snippets found."

Here is the brief for the research report:
<researchBrief>
${researchBrief}
</researchBrief>

Here is the query used to retrieve this document:
<query>
${query}
</query>

Here is the search result:
<searchResult>
${content}
</searchResult>

IMPORTANT: do NOT include any text besides the snippet. Just write the snippet.`;

    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      messages: [
        {
          role: "system",
          content: systemMessage,
        },
        {
          role: "user",
          content: fullPrompt,
        },
      ],
      providerOptions: {
        openai: {
          prediction: {
            type: "content",
            content: content,
          },
        },
      },
    });

    return text;
  },
);
