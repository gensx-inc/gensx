import * as gensx from "@gensx/core";
import { generateObject } from "@gensx/vercel-ai";
import { openai } from "@ai-sdk/openai";

import { ArxivEntry } from "./arxiv.js";
import { z } from "zod";

export interface GradeDocumentProps {
  prompt: string;
  document: ArxivEntry;
}

export interface GradeDocumentOutput {
  useful: boolean;
}

@gensx.Component()
export async function GradeDocument({
  prompt,
  document,
}: GradeDocumentProps): Promise<boolean> {
  const systemMessage = `You are a helpful research assistant.

Instructions:
- You will be given user prompt and a document
- Your goal is to determine if the document is useful to the user prompt
- Please be strict in your evaluation

Output Format:
- Please return json with the following format:
{
"useful": boolean
}`;

  const userMessage = `Here is the prompt:
<prompt>
${prompt}
</prompt>

Here is the document:
<document>
<title>
    ${document.title}
</title>
<summary>
    ${document.summary}
</summary>
</document>`;

  const response = await generateObject({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: systemMessage,
      },
      { role: "user", content: userMessage },
    ],
    schema: z.object({
      useful: z.boolean(),
    }),
  });

  return response.object.useful;
}
