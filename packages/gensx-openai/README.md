# @gensx/openai

A pre-wrapped version of the OpenAI SDK for GenSX. This package provides a simple way to use OpenAI's API with GenSX components.

## Installation

```bash
npm install @gensx/openai openai
```

## Usage

You can use this package in two ways:

### 1. Drop-in Replacement (Recommended)

Simply replace your OpenAI import with the GenSX version:

```ts
// Instead of:
// import { OpenAI } from 'openai';

// Use:
import { OpenAI } from "@gensx/openai";

// Create a client as usual
const client = new OpenAI({
  apiKey: "your-api-key",
});

// All methods are automatically wrapped with GenSX functionality
const completion = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});

// Use embeddings
const embedding = await client.embeddings.create({
  model: "text-embedding-ada-002",
  input: "Hello world!",
});

// Use responses
const response = await client.responses.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### 2. Wrap an Existing Instance

If you already have an OpenAI instance, you can wrap it with GenSX functionality:

```ts
import { OpenAI } from "openai";
import { wrapOpenAI } from "@gensx/openai";

// Create your OpenAI instance as usual
const client = wrapOpenAI(
  new OpenAI({
    apiKey: "your-api-key",
  }),
);

// Now all methods are wrapped with GenSX functionality
const completion = await client.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

## API

The package exports:

1. `OpenAI` - A drop-in replacement for the OpenAI client that automatically wraps all methods with GenSX functionality
2. `wrapOpenAI` - A function to manually wrap an OpenAI instance with GenSX functionality

## License

Apache-2.0
