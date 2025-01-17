# GenSX Examples 📚

This folder contains a number of different examples to help you get up and running with GenSX.

## Running the Examples

To run the examples, start by installing and building everything from the root directory of the repo. This will install the dependencies and build all of the packages and examples

```bash
pnpm install

pnpm build:all
```

From there, follow the instructions in the README of the example you want to run.

Alternatively, you can run the examples directly from the root directory of the repo using the following command:

```bash
OPENAI_API_KEY=<my api key> turbo run run --filter="./examples/blogWriter"
```

Make sure to check what environment variables are required for each example.

## Basic Examples

| Example               | Description                                               |
| --------------------- | --------------------------------------------------------- |
| 📊 Structured Outputs | Demonstrates using structured outputs with GenSX          |
| 🔄 Reflection         | Shows how to use a self-reflection pattern with GenSX     |
| 🌊 Streaming          | Demonstrates how to handle streaming responses with GenSX |

## Full Examples

| Example                 | Description                                                                                  |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| 🔍 Hacker News Analyzer | Analyzes HN posts and generates summaries and trends using Paul Graham's writing style       |
| ✍️ Blog Writer          | Generates blogs through an end-to-end workflow including topic research and content creation |
