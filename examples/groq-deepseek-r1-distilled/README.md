# Groq DeepSeek R1 Distilled Example

This example demonstrates how to use the Groq DeepSeek R1 Distilled model with [GenSX](https://gensx.dev).

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your environment variables:

   ```bash
   export GROQ_API_KEY=your-api-key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

## Usage

The example provides a `GroqDeepSeekR1Completion` component that can be used to generate completions using the Groq DeepSeek R1 Distilled model. Here's a basic example:

```typescript
import { gsx } from "gensx";
import { GroqDeepSeekR1Completion } from "./groq-deepseek-r1-distilled.js";

const result = await gsx.execute(
  <GroqDeepSeekR1Completion prompt="Write me a blog post about the future of AI." />
);

console.log(result);
```

The component returns an object with two fields:

- `thinking`: Extracted content between `<think>` tags
- `completion`: The final response with thinking tags removed

## Configuration

The example uses the following configuration:

- [Groq](https://groq.com) API Key: `GROQ_API_KEY`
