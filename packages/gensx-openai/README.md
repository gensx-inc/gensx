# @gensx/openai

A pre-wrapped version of the OpenAI SDK for GenSX. This package provides a simple way to use OpenAI's API with GenSX components.

## Installation

```bash
npm install @gensx/openai openai
```

## Usage

```ts
import { openai } from "@gensx/openai";

// Use chat completions
const completion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});

// Use embeddings
const embedding = await openai.embeddings.create({
  model: "text-embedding-ada-002",
  input: "Hello world!",
});

// Use responses
const response = await openai.responses.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## API

The package exports a pre-wrapped version of the OpenAI SDK, making all methods available as GenSX components. The wrapped client is available as the `openai` export.

### Types

All OpenAI types are re-exported for convenience:

```ts
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParams,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionRole,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletionToolMessageParam,
  CreateEmbeddingResponse,
  EmbeddingCreateParams,
  Response,
  ResponseCreateParams,
  ResponseStreamEvent,
} from "@gensx/openai";
```

## License

Apache-2.0
