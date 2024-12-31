import { setTimeout } from "node:timers/promises";

import { gsx } from "gensx";

// const llm = createLLMService({
//   model: "gpt-4",
//   temperature: 0.7,
// });

interface ChatCompletionProps {
  prompt: string;
}

export const ChatCompletion = gsx.StreamComponent<ChatCompletionProps>(
  async ({ prompt }) => {
    // Use the LLM service's streaming API
    // const result = await llm.completeStream(prompt);

    // return result.stream();

    function* stream() {
      yield "Hello ";
      yield "World";
      yield "!\n\n";
      yield "H";
      yield "e";
      yield "r";
      yield "e";
      yield " ";
      yield "i";
      yield "s";
      yield " ";
      yield "t";
      yield "h";
      yield "e";
      yield " ";
      yield "p";
      yield "r";
      yield "o";
      yield "m";
      yield "p";
      yield "t";
      yield "\n";
      for (const char of prompt) {
        yield char;
      }
    }

    const generator = stream();
    const iterator: AsyncIterableIterator<string> = {
      next: async () => {
        const result = generator.next();
        await setTimeout(10);
        return result;
      },
      [Symbol.asyncIterator]: () => iterator,
    };

    return iterator;
  },
);
