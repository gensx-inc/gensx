import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "@gensx/vercel-ai";
import { QueryResult } from "../types";
import { z } from "zod";

interface EvaluateInput {
  researchBrief: string;
  queryResults: QueryResult[];
}

const evaluateSchema = z.object({
  is_sufficient: z.boolean(),
  analysis: z.string(),
  follow_up_queries: z.array(z.string()),
});

export const Evaluate = gensx.Component(
  "Evaluate",
  async ({ researchBrief, queryResults }: EvaluateInput) => {
    const systemMessage = "You are an experienced research assistant.";

    // Format all query results into XML structure
    const formattedResults = queryResults
      .map(
        (queryResult) => `<query>
  <queryText>${queryResult.query}</queryText>
  <results>
${queryResult.results
  .map(
    (result) => `    <result>
      <title>${result.title}</title>
      <url>${result.url}</url>
      <content>${result.content ?? result.description}</content>
    </result>`,
  )
  .join("\n")}
  </results>
</query>`,
      )
      .join("\n");

    const fullPrompt = `Please analyze the search results to determine if we have the necessary information to write the research report or if we need to do more research.

Instructions:
- Review all the search results in relation to the research brief
- Consider if you have enough details and sources to write a detailed research report
- Consider any gaps in the current information and what additional information is needed
- If there are gaps, write two or three follow-up queries to address the identified knowledge gaps
- Do not repeat previous queries, this usually will not yield new information
- Search queries should generally be between 3 and 7 words

Here is the brief for the research report:
<researchBrief>
${researchBrief}
</researchBrief>

Here are all the search results:
<searchResults>
${formattedResults}
</searchResults>

Output Format:
- Format your response as a JSON object with these exact keys:
   - "is_sufficient": true or false - whether the current search results sufficiently address the research brief
   - "analysis": Briefly describe your analysis of the existing search results and what additional information is needed. Be brief, only writing a couple of sentences.
   - "follow_up_queries": Write two or three follow-up queries to address the identified knowledge gaps

Example:
{
    "is_sufficient": false, // or true
    "thought_process": "The existing search results have good information on xyz but lack information on abc. I need to...", // "" if is_sufficient is true
    "follow_up_queries": [
        "Some query",
        "Another query",
        "A third query",
    ]
}}`;

    const { object } = await generateObject({
      model: openai("gpt-4.1"),
      schema: evaluateSchema,
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
    });

    return object;
  },
);
