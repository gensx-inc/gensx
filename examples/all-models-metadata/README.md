# GenSX OpenRouter Models Metadata Explorer

This project demonstrates how to use [GenSX](https://gensx.com) to fetch and display metadata about AI models available through OpenRouter.

## Features

- Fetches all available models from OpenRouter API
- Displays model information including pricing details
- Sorts models alphabetically for easy reference
- Calculates and formats pricing per million tokens

## Prerequisites

- Node.js 18 or higher
- An OpenRouter API key (set as `OPENROUTER_API_KEY` environment variable)

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your OpenRouter API key:

   ```bash
   export OPENROUTER_API_KEY=your_api_key_here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   Or run the application directly:

   ```bash
   npm start
   ```

## Project Structure

The main application logic is in `src/index.tsx`, which defines:

- `OpenRouterModel` interface for type-safe model data handling
- `GetAllOpenRouterModels` component to fetch models from OpenRouter
- `GetModelPricing` component to extract and format pricing information
- `AllOpenRouterModelPricing` workflow to display all models with their pricing

## Dependencies

- `@gensx/core`: Core GenSX functionality
- `@gensx/openai`: OpenAI integration
