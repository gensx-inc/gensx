# GenSX Examples 📚

This folder contains a number of different examples to help you get up and running with GenSX.

## Running the Examples

From the root of the repo, run the following command to build packages and run an example:

```bash
OPENAI_API_KEY=<my api key> pnpm start:example <example-name>
```

To run from the example directory, run:

```bash
# From the root of the repo
pnpm build

# From the example directory
cd examples/<example-name>
pnpm start
```

Make sure to check what environment variables are required for each example.

## Basic Examples

| Example                                         | Description                                                      |
| ----------------------------------------------- | ---------------------------------------------------------------- |
| 📊 [Structured Outputs](./structured-outputs)   | Demonstrates using structured outputs with GenSX                 |
| 🔄 [Reflection](./reflection)                   | Shows how to use a self-reflection pattern with GenSX            |
| 🌊 [Streaming](./streaming)                     | Demonstrates how to handle streaming responses with GenSX        |
| 🗃️ [Contexts](./contexts)                       | Shows how to use contexts to manage state in GenSX               |
| 🔌 [Providers](./providers)                     | Shows how to create a custom provider for GenSX                  |
| 🎭 [Nested Providers](./nested-providers)       | Demonstrates how to nest and combine multiple providers in GenSX |
| 🧩 [Reusable Components](./reusable-components) | Shows how to create and use reusable components in GenSX         |

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
