# GenSX Hacker News Analyzer Example

This example demonstrates how to use GenSX to create a workflow that analyzes Hacker News posts. It shows how to combine data fetching, analysis, and content generation in a single workflow.

## Overview

The Hacker News Analyzer workflow:

1. Fetches the latest 500 posts from the Hacker News API
2. Analyzes the content to identify trends and insights
3. Generates two output files:
   - A detailed markdown report
   - A concise tweet-sized summary

## Getting Started

1. Install the required dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

## Running in GenSX Cloud

To run the workflow in GenSX Cloud:

1. Deploy your workflow:

   ```bash
   pnpm run deploy
   ```

2. Run the workflow:

   ```bash
   gensx run HackerNewsAnalyzerWorkflow
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflow, test it, analyze traces, and get code snippets.

## Running locally

You can run the workflow directly:

```bash
pnpm run start
```

This will:

1. Fetch the latest 500 HN posts
2. Analyze the content
3. Generate two files:
   - `hn_analysis_report.md`: A detailed analysis report
   - `hn_analysis_tweet.txt`: A tweet-sized summary of the analysis

### Run the API locally

You can also test the workflow through a local API server:

```bash
pnpm start
```

This will start a local API server and you can call the workflow APIs via curl or any HTTP client:

```bash
curl -X POST http://localhost:1337/workflows/HackerNewsAnalyzerWorkflow \
  -H "Content-Type: application/json" \
  -d '{}'
```

A swagger UI will also be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflow.
