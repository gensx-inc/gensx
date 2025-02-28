# Model Comparison - Why is the Ocean Salty?

This example demonstrates how to use [GenSX](https://gensx.com) to compare responses from different AI models and providers to the same prompt.

## What This Example Does

This application:

1. Takes the prompt "Why is the ocean salty?"
2. Sends it to multiple AI providers (OpenAI and Groq)
3. For each provider, gets responses from all available text generation models
4. Displays the results for comparison

## Prerequisites

- Node.js 18 or higher
- API keys for the providers you want to use:
  - OpenAI API key
  - Groq API key

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your environment variables:

   Create a `.env` file with your API keys:

   ```
   OPENAI_API_KEY=your_openai_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. The application will run the workflow and display the model comparison results in the console.

## Customization

You can modify `src/index.tsx` to:

- Change the prompt
- Add or remove providers
- Adjust model filtering criteria
- Change the output format
