# GenSX Project

Starter project for [GenSX](https://gensx.com), created using `npx create-gensx`.

## Getting Started

1. Log in to GenSX (if you haven't already):

   ```bash
   npx gensx login
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up your environment variables (if needed):

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

## Running in GenSX Cloud

To run your workflows in GenSX Cloud:

1. Deploy your workflows:

   ```bash
   npm run deploy
   ```

2. Call your workflows using the GenSX CLI:

   ```bash
   gensx run ChatWorkflow --input '{"userMessage": "Hello, world!"}'
   ```

Once deployed, you can go to the [GenSX console](https://app.gensx.com) to see your workflows, test them, analyze traces, and get code snippets.

## Running Locally

### Test workflows directly

You can run workflows directly using the `src/index.tsx` file:

```bash
npm run dev
```

### Run the API locally

Start a local API server to test your workflows:

```bash
npm start
```

This will start a local API server and you can call your workflow APIs via curl or any HTTP client:

```
curl -X POST http://localhost:1337/workflows/ChatWorkflow \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Hello, world!"
  }'
```

A swagger UI will be available at [http://localhost:1337/swagger-ui](http://localhost:1337/swagger-ui) to view the API details and test the workflows.
