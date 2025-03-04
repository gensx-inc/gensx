# GenSX OpenRouter Example

This example demonstrates how to use [GenSX](https://gensx.com) with [OpenRouter](https://openrouter.ai).

## Overview

This example shows how to:

- Configure GenSX to use OpenRouter as a provider
- Access models through OpenRouter

## Prerequisites

- Node.js 18 or higher
- An [OpenRouter](https://openrouter.ai) API key

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your environment variables:

   Create a `.env` file in the root directory with your OpenRouter API key:

   ```
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Edit `src/index.tsx` to customize your GenSX application.

## How It Works

The example uses the OpenAIProvider with a custom baseURL pointing to OpenRouter's API. This allows you to use the familiar OpenAI-compatible interface while accessing a wide range of models through OpenRouter.

```tsx
<OpenAIProvider
  apiKey={process.env.OPENROUTER_API_KEY}
  baseURL="https://openrouter.ai/api/v1"
>
  <GenerateText userInput={userInput} />
</OpenAIProvider>
```

## Learn More

- [GenSX Documentation](https://gensx.com/docs)
- [OpenRouter Documentation](https://openrouter.ai/docs)
