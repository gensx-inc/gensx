# @gensx/openai

OpenAI integration for [GenSX](https://github.com/gensx-inc/gensx) - Build AI workflows using JSX.

## Installation

```bash
npm install @gensx/openai
```

## Usage

```tsx
import * as gensx from "@gensx/core";
import { OpenAIProvider, ChatCompletion } from "@gensx/openai";

const ChatBot = gensx.Component(async ({ userInput }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY!}>
      <ChatCompletion
        messages={[
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ]}
        model="gpt-4o"
        temperature={0.7}
      />
    </OpenAIProvider>
  );
});

// Use with streaming
const StreamingChat = gensx.Component(async ({ userInput }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY!}>
      <ChatCompletion
        messages={[
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: userInput },
        ]}
        model="gpt-4o"
        stream={true}
      >
        {async (stream) => {
          for await (const token of stream) {
            process.stdout.write(token);
          }
        }}
      </ChatCompletion>
    </OpenAIProvider>
  );
});
```

## Structured Output

The `StructuredOutput` component allows you to get structured, typed outputs from OpenAI models. It uses Zod schemas to validate the output.

```tsx
import { z } from "zod";
import { OpenAIProvider, StructuredOutput } from "@gensx/openai";

// Define your output schema
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  isActive: z.boolean(),
});

type User = z.infer<typeof userSchema>;

// Use the StructuredOutput component
const result = await gensx.execute<User>(
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <StructuredOutput
      model="gpt-4"
      messages={[{ role: "user", content: "Get me user data for John Doe" }]}
      outputSchema={userSchema}
    />
  </OpenAIProvider>,
);

console.log(result); // { name: "John Doe", age: 30, isActive: true }
```

### Controlling Structured Output Method

By default, the `StructuredOutput` component uses the most appropriate method for structured outputs based on the provider:

- For OpenAI and Azure OpenAI, it uses the `response_format` parameter
- For other providers, it uses tools to achieve structured outputs

You can override this behavior with the `useToolsForStructuredOutput` parameter:

```tsx
// Force using tools even with OpenAI
<StructuredOutput
  model="gpt-4"
  messages={[{ role: "user", content: "Get me user data" }]}
  outputSchema={userSchema}
  useToolsForStructuredOutput="true"
/>

// Force using response_format even with non-OpenAI providers
<StructuredOutput
  model="gpt-4"
  messages={[{ role: "user", content: "Get me user data" }]}
  outputSchema={userSchema}
  useToolsForStructuredOutput="false"
/>
```

The `useToolsForStructuredOutput` parameter accepts three values:

- `"default"`: Use the most appropriate method based on the provider (default behavior)
- `"true"`: Always use tools for structured outputs
- `"false"`: Always use response_format for structured outputs

### Using with Tools

You can also combine structured outputs with tools:

```tsx
import { z } from "zod";
import { GSXTool, OpenAIProvider, StructuredOutput } from "@gensx/openai";

// Define your output schema
const userSchema = z.object({
  name: z.string(),
  age: z.number(),
  isActive: z.boolean(),
});

// Define a tool
const searchTool = GSXTool.create({
  name: "search_user",
  description: "Search for a user by name",
  schema: z.object({
    name: z.string(),
  }),
  run: async ({ name }) => {
    // Simulate a database lookup
    return { name, age: 30, isActive: true };
  },
});

// Use the StructuredOutput component with tools
const result = await gensx.execute(
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <StructuredOutput
      model="gpt-4"
      messages={[{ role: "user", content: "Get me user data for John Doe" }]}
      outputSchema={userSchema}
      tools={[searchTool]}
    />
  </OpenAIProvider>,
);

console.log(result); // { name: "John Doe", age: 30, isActive: true }
```
