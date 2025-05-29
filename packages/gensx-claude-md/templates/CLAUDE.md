# GenSX Project Claude Memory

<!-- BEGIN_MANAGED_SECTION -->
<!-- WARNING: Everything between BEGIN_MANAGED_SECTION and END_MANAGED_SECTION will be overwritten when updating @gensx/claude-md -->
<!-- Add your custom content outside of this section to preserve it during updates -->

This file serves as persistent memory for Claude when working with GenSX projects.

## Project Commands

### Development

```bash

# Build the project
npm run build

# Run the workflow
npm run dev
```

## Code Style Preferences

- Use TypeScript for all new files
- Prefer async/await over promise chains
- Add proper JSDoc comments for all exported functions and types
- Use consistent naming conventions:
  - Components and workflows: PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase

## Common Patterns

### Component Definition

Components are the building blocks of GenSX applications. Here's a basic example of a GenSX component:

```typescript
import * as gensx from "@gensx/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "@gensx/vercel-ai";

interface GreetingInput {
  name: string;
  formal?: boolean;
}

const Greeting = gensx.Component(
  "Greeting",
  async ({ name, formatOutput = false, formal = false }: GreetingInput) => {
    const result = await generateText({
      model: openai("gpt-4.1-mini"),
      messages: [
        {
          role: "system",
          content:
            "You are a friendly assistant that creates personalized greetings. You can adjust your tone based on whether the greeting should be formal or informal.",
        },
        {
          role: "user",
          content: `Create a ${formal ? "formal" : "casual"} greeting for ${name}. Keep it concise and ${formal ? "professional" : "warm"}.`,
        },
      ],
    });
    return result.text;
  },
);
```

To run a component, you just call it like a function:

```typescript
const greeting = await Greeting({ name: "John", formal: true });
```

### Workflow Definition

In GenSX, workflows are the entry points to your application. Here's a basic example of a GenSX workflow:

```typescript
// Main workflow that combines components
const WelcomeWorkflow = gensx.Workflow(
  "WelcomeWorkflow",
  async ({ name }: GreetingInput) => {
    // Determine if we should use formal greeting based on time of day
    const hour = new Date().getHours();
    const isFormal = hour >= 9 && hour <= 17;

    const greeting = await Greeting({
      name,
      formal: isFormal,
    });

    return {
      greeting,
      isFormal,
      timestamp: new Date().toISOString(),
    };
  },
);

export { WelcomeWorkflow };
```

Similar to components, workflows are run just like a function. All workflows need to be exported from the workflows.ts file so that they can be deployed.

## LLM Providers

In addition to the Vercel AI SDK, GenSX has build in support for the OpenAI SDK, and the Anthropic SDK.

### OpenAI

By default, you should import `OpenAI` from `@gensx/openai` and use it like this:

```typescript
import { OpenAI } from "@gensx/openai";

const openai = new OpenAI();
```

However, you can also import the `openai` library directly and import `wrapOpenAI` from `@gensx/openai` to wrap it in a GenSX provider.

```typescript
import { OpenAI } from "openai";
import { wrapOpenAI } from "@gensx/openai";

const openai = wrapOpenAI(new OpenAI());
```

### Anthropic

Both options are also available for Anthropic.

```typescript
import { Anthropic } from "@gensx/anthropic";

const anthropic = new Anthropic();
```

```typescript
import { Anthropic } from "anthropic";
import { wrapAnthropic } from "@gensx/anthropic";

const anthropic = wrapAnthropic(new Anthropic());
```

<!-- END_MANAGED_SECTION -->

## Custom Project Information

Add your custom project information here. This section will not be overwritten during updates.

```

```
