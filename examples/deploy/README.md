# Dev Server Example

This example demonstrates how to deploy a GenSX workflow.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Deploy:

   ```bash
   gensx build src/index.tsx
   ```

3. Run:

   ```bash
   gensx dev
   ```

4. Run a workflow:

   ```bash
   curl -X POST -N http://localhost:8000/stream-workflow -H "Content-Type: application/json" -d '{ "userInput": "Hello, world!", "stream": true }'
   ```
