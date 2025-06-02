# GenSX Examples 📚

This folder contains a number of different examples to help you get up and running with GenSX.

## Running the Examples

Each example has a README with detailed instructions on how to run the example. Generally, the steps will look something like this:

```bash
# Navigate to the example directory
cd examples/<example-name>

# Install dependencies
pnpm install

# Run the example
pnpm run dev
```

Make sure to check what environment variables are required for each example.

## Basic Examples

| Example                                       | Description                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| [Reflection](./reflection)                    | Shows how to use a self-reflection pattern with GenSX                                                    |
| 🦾 [Anthropic Examples](./anthropic-examples) | Examples showing how to use [@gensx/anthropic](https://www.gensx.com/docs/component-reference/anthropic) |
| 🧠 [OpenAI Examples](./openai-examples)       | Examples showing how to use [@gensx/openai](https://www.gensx.com/docs/component-reference/openai)       |
| 🌊 [Vercel AI SDK Examples](./vercel-ai)      | Examples showing how to use [@gensx/vercel-ai](https://www.gensx.com/docs/component-reference/vercel-ai) |

## Full Examples

| Example                                           | Description                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 🔍 [Hacker News Analyzer](./hacker-news-analyzer) | Analyzes HN posts and generates summaries and trends using Paul Graham's writing style       |
| ✍️ [Blog Writer](./blog-writer)                   | Generates blogs through an end-to-end workflow including topic research and content creation |
| 🔬 [Deep Research](./deep-research)               | Generates a report from a prompt after researching and summarizing a list of research papers |
| 💻 [Computer Use](./openai-computer-use)          | Demonstrates how to use the OpenAI computer use tool with GenSX                              |
| 🗄️ [Text to SQL](./text-to-sql)                   | Shows how to use database storage to translate natural language to SQL queries               |
| 🔎 [RAG](./rag)                                   | Demonstrates retrieval augmented generation using vector search storage                      |
| 💬 [Chat Memory](./chat-memory)                   | Shows how to build a chat application with persistent chat history using blob storage        |
