# Mastra + GenSX Weather Planner

This example shows how to wrap a [Mastra](https://mastra.ai) project (workflows and agents) as GenSX workflows. It includes:

- `weatherWorkflow`: Fetches weather for a city and plans activities using an agent
- `weatherAgent`: A Claude-based agent with a `weatherTool` for current conditions

The GenSX wrapper in `gensx/wrapper.ts` exposes Mastra workflows/agents so you can run them locally via the GenSX dev server or deploy them to GenSX Cloud.

## Getting started

1. Log in to GenSX (if you haven't already):

   ```bash
   npx gensx login
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set environment variables:

   ```bash
   # Required for the agent model (Claude Sonnet 3.5 via @ai-sdk/anthropic)
   export ANTHROPIC_API_KEY=your_anthropic_api_key
   ```

4. Start the local GenSX dev server:

   ```bash
   pnpm dev
   ```

   This will start the GenSX server and load the workflows from `gensx/workflows.ts`.
   - API: `http://localhost:1337`
   - Swagger UI: `http://localhost:1337/swagger-ui`

Node.js 18.17+ is required (see `package.json` engines).

## Endpoints and examples (local)

- **weatherWorkflow**: plans activities for a given city
  - Input schema: `{ "city": string }`
  - Output schema: `{ "activities": string }`

  Example:

  ```bash
  curl -X POST http://localhost:1337/workflows/weatherWorkflow \
    -H "Content-Type: application/json" \
    -d '{
      "city": "Seattle"
    }'
  ```

- **weatherAgent**: general weather assistant using a tool for current conditions
  - Input schema: `{ "content": string }`
  - Output: `string`

  Example:

  ```bash
  curl -X POST http://localhost:1337/workflows/weatherAgent \
    -H "Content-Type: application/json" \
    -d '{
      "content": "What is the weather in Paris today?"
    }'
  ```

Notes:

- Weather data comes from Open-Meteo (no API key required).
- The workflow streams agent output to stdout while building the final `activities` string.

## Deploying to GenSX Cloud

Deploy the workflows defined in `gensx/workflows.ts`:

```bash
pnpm run deploy
```

This runs:

```bash
npx gensx deploy -e ANTHROPIC_API_KEY ./gensx/workflows.ts
```

After deployment, you can run them in the cloud:

```bash
gensx run weatherWorkflow --input '{"city":"Seattle"}'
gensx run weatherAgent --input '{"content":"Plan outdoor activities for Austin tomorrow"}'
```

Then visit the GenSX console to inspect runs, traces, and code snippets.

## Project layout

- `src/mastra/` — Mastra project
  - `agents/weather-agent.ts` — Claude-based agent with `weatherTool`
  - `tools/weather-tool.ts` — Uses Open-Meteo to fetch current weather
  - `workflows/weather-workflow.ts` — Fetch forecast → plan activities
  - `index.ts` — Creates and exports the Mastra instance
- `gensx/`
  - `wrapper.ts` — Wraps Mastra agents/workflows as GenSX workflows
  - `workflows.ts` — Exports wrapped `weatherWorkflow` and `weatherAgent`

## Customization

- Swap the model used by the agent in `src/mastra/agents/weather-agent.ts`.
- Add or modify tools in `src/mastra/tools/`.
- Create new Mastra workflows and they will be exposed via the wrapper.

## Troubleshooting

- 401/403 calling agent: check `ANTHROPIC_API_KEY`.
- No results for a city: the Open-Meteo geocoding API might not find it; try a different spelling.
- Port conflicts: ensure nothing else is using `1337`.
