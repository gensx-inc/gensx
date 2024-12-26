import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface StreamResult<T> {
  value: Promise<T>;
  stream: () => AsyncIterator<string>;
}

class LLMError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export function createLLMService(config: LLMConfig) {
  const {
    model = "gpt-4",
    temperature = 0.7,
    maxTokens,
    maxRetries = 3,
    retryDelay = 1000,
  } = config;

  // Helper to create a streaming response
  function createStreamingResponse(
    getStream: () => AsyncIterable<string>,
    getValue: () => Promise<string>,
  ): StreamResult<string> {
    return {
      stream: () => {
        const stream = getStream();
        return {
          async next() {
            try {
              const { done, value } =
                await stream[Symbol.asyncIterator]().next();
              return { done, value: value || "" };
            } catch (error) {
              console.error("Stream error:", error);
              return { done: true, value: undefined };
            }
          },
          [Symbol.asyncIterator]() {
            return this;
          },
        };
      },
      value: getValue(),
    };
  }

  // Chat with streaming support
  async function chatStream(
    messages: ChatMessage[],
  ): Promise<StreamResult<string>> {
    // Create a single streaming request
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    // Split the stream into two
    const [stream1, stream2] = response.tee();

    // Create a promise that will resolve with the full text
    let fullText = "";
    const {
      promise: valuePromise,
      resolve: resolveValue,
      reject: rejectValue,
    } = (() => {
      let resolve: (value: string) => void;
      let reject: (error: Error) => void;
      const promise = new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve: resolve!, reject: reject! };
    })();

    // Accumulate the full text in the background using stream1
    (async () => {
      try {
        for await (const chunk of stream1) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullText += content;
          }
        }
        resolveValue(fullText);
      } catch (e) {
        rejectValue(e instanceof Error ? e : new Error(String(e)));
      }
    })();

    // Create a stream generator function that yields chunks immediately from stream2
    const getStream = async function* () {
      try {
        for await (const chunk of stream2) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            yield content;
          }
        }
      } catch (e) {
        throw e instanceof Error ? e : new Error(String(e));
      }
    };

    return {
      stream: getStream,
      value: valuePromise,
    };
  }

  // Original non-streaming chat function
  async function chat(messages: ChatMessage[]): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new LLMError("No content in response");
        }

        return content;
      } catch (error) {
        console.error("Request failed:", error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on invalid requests
        if (error instanceof OpenAI.APIError && error.status === 400) {
          throw new LLMError("Invalid request to OpenAI", error);
        }

        // Last attempt failed
        if (attempt === maxRetries - 1) {
          throw new LLMError(
            `Failed to get completion after ${maxRetries} attempts`,
            lastError,
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // This should never happen due to the loop above
    throw new LLMError("Unexpected end of chat function");
  }

  // Complete with streaming support
  async function completeStream(prompt: string): Promise<StreamResult<string>> {
    return chatStream([{ role: "user", content: prompt }]);
  }

  // Original non-streaming complete function
  async function complete(prompt: string): Promise<string> {
    return chat([{ role: "user", content: prompt }]);
  }

  return {
    chat,
    chatStream,
    complete,
    completeStream,
  };
}

// Example usage:
// const llm = createLLMService({
//   model: "gpt-4",
//   temperature: 0.7,
//   maxRetries: 3,
// });
//
// const response = await llm.chat([
//   { role: "system", content: "You are a helpful assistant." },
//   { role: "user", content: "Hello!" }
// ]);
