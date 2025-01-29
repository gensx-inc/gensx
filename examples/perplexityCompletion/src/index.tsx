import { gsx } from "gensx";
import { PerplexityCompletion } from "./perplexity.js";

const result = await gsx.execute<string>(
  <PerplexityCompletion
    messages={[{ role: "user", content: "What is the weather in Tokyo?" }]}
    model="sonar-pro"
  />,
);

console.log(result);
