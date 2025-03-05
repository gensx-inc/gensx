import * as gensx from "@gensx/core";
import { ChatCompletion } from "@gensx/openai";

import { ArxivEntry } from "./arxiv.js";

export interface GradeDocumentProps {
  prompt: string;
  document: ArxivEntry;
}

export interface GradeDocumentOutput {
  useful: boolean;
}

export const GradeDocument = gensx.Component<GradeDocumentProps, boolean>(
  "GradeDocument",
  ({ prompt, document }) => {
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

    return (
      <ChatCompletion
        model="gpt-4o-mini"
        messages={[
          {
            role: "system",
            content: systemMessage,
          },
          { role: "user", content: userMessage },
        ]}
        response_format={{ type: "json_object" }}
      >
        {(response: string) => {
          const output = JSON.parse(response) as GradeDocumentOutput;
          return output.useful;
        }}
      </ChatCompletion>
    );
  },
);
