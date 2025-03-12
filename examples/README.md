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

| Example                                        | Description                                                      |
| ---------------------------------------------- | ---------------------------------------------------------------- |
| 📊 [Structured Outputs](./structuredOutputs)   | Demonstrates using structured outputs with GenSX                 |
| 🔄 [Reflection](./reflection)                  | Shows how to use a self-reflection pattern with GenSX            |
| 🌊 [Streaming](./streaming)                    | Demonstrates how to handle streaming responses with GenSX        |
| 🗃️ [Contexts](./contexts)                      | Shows how to use contexts to manage state in GenSX               |
| 🔌 [Providers](./providers)                    | Shows how to create a custom provider for GenSX                  |
| 🎭 [Nested Providers](./nestedProviders)       | Demonstrates how to nest and combine multiple providers in GenSX |
| 🧩 [Reusable Components](./reusableComponents) | Shows how to create and use reusable components in GenSX         |

## Full Examples

| Example                                           | Description                                                                                  |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 🔍 [Hacker News Analyzer](./hackerNewsAnalyzer)   | Analyzes HN posts and generates summaries and trends using Paul Graham's writing style       |
| ✍️ [Blog Writer](./blogWriter)                    | Generates blogs through an end-to-end workflow including topic research and content creation |
| 🔬 [Deep Research](./examples/deepResearch)       | Generates a report from a prompt after researching and summarizing a list of research papers |
| 💻 [Computer Use](./examples/openai-computer-use) | Demonstrates how to use the OpenAI computer use tool with GenSX                              |
