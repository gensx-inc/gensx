import { ChatCompletion } from "@gensx/openai";
import { gsx } from "gensx";

export interface QueryGeneratorProps {
  prompt: string;
}

export interface QueryGeneratorOutput {
  queries: string[];
}

export const QueryGenerator = gsx.Component<
  QueryGeneratorProps,
  QueryGeneratorOutput
>("QueryGenerator", ({ prompt }) => {
  const systemMessage = `You are a helpful research assistant. 

    Instructions:
    - You will be given a prompt and your job is to return a list of arxiv search queries
    - Please write between 1 and 3 queries.
    
    Output Format:
    Please return json with the following format:
    {
      "queries": ["query1", "query2", "query3"]
    }`;
  return (
    <ChatCompletion
      model="gpt-4o-mini"
      messages={[
        {
          role: "system",
          content: systemMessage,
        },
        { role: "user", content: prompt },
      ]}
      response_format={{ type: "json_object" }}
    >
      {(response: string) => {
        return JSON.parse(response) as QueryGeneratorOutput;
      }}
    </ChatCompletion>
  );
});
