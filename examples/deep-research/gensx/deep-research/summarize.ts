import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

interface SummarizeInput {
  researchBrief: string;
  query: string;
  content: string;
}

export const Summarize = gensx.Component(
  "Summarize",
  async ({ researchBrief, query, content }: SummarizeInput) => {
    if (content === "") {
      return "";
    }

    const systemMessage = "You are an experienced research assistant.";

    const fullPrompt = `Given the research brief, search query, and the search result, please remove any part of the search results not relevant to the research breif and queries.

Instructions:
- Remove any fluff, headers, footers, and non-relevant information
- Make sure to keep any information from the search result that is relevant to the research brief and queries. Error on the side of keeping too much.
- Keep the content you extract verbatim - no paraphrasing or rephrasing.
- Feel free to clean up the formatting of the document where necessary.

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

IMPORTANT: do NOT include any text besides the summary. Just write the summary.`;

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
