# OpenAI Computer Use Tool Example

This example demonstrates how to use the OpenAI [computer use tool](https://platform.openai.com/docs/guides/tools-computer-use) with the [Responses API](https://platform.openai.com/docs/api-reference/responses) and GenSX.

## Setup

You'll need to install Playwright to run this example. The model will interact with a chromium browser powered by Playwright to accomplish the task.

```bash
# Install dependencies
pnpm install

# Install Playwright
npx playwright install
```

## Usage

You can update the prompt in the `index.tsx` file to try out different tasks.

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=<your_api_key>

# Run the example
pnpm run start
```
