# GenSX Copilot Example

This example demonstrates how to build an AI-powered copilot that can interact with web pages using jQuery-based introspection tools. The copilot can inspect elements, click buttons, fill forms, and help users navigate web applications through natural language commands.

## Features

- **jQuery-based DOM Interaction**: Uses jQuery selectors to interact with page elements
- **Client-side Tool Integration**: Combines server-side AI capabilities with client-side DOM manipulation
- **Real-time Streaming**: Shows AI responses as they're generated
- **Interactive Demo**: Includes a todo app to demonstrate the copilot's capabilities

## Available Tools

The copilot has access to the following tools:

- `inspectElement` - Inspect elements using jQuery selectors
- `clickElement` - Click on specific elements
- `fillForm` - Fill form inputs with values
- `submitForm` - Submit forms
- `getPageStructure` - Get an overview of the page structure
- `highlightElement` - Visually highlight elements on the page
- `waitForElement` - Wait for elements to appear

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Running the Example

This example requires both the Next.js dev server and the GenSX dev server to run concurrently:

```bash
pnpm dev
```

This will start:
- Next.js app on http://localhost:3003
- GenSX dev server on http://localhost:1337

### Using the Copilot

1. Open http://localhost:3003 in your browser
2. Click the blue chat button in the bottom right corner
3. Try commands like:
   - "Show me what's on this page"
   - "Add a new todo item called 'Test GenSX Copilot'"
   - "Check the second todo item"
   - "Delete the completed todos"
   - "Highlight all the buttons on the page"

## Project Structure

```
copilot/
├── gensx/
│   ├── tools/
│   │   └── toolbox.ts      # jQuery-based tool definitions
│   └── workflows.ts        # Copilot workflow implementation
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── gensx/     # GenSX API routes
│   │   └── page.tsx       # Main page with todo app
│   ├── components/
│   │   ├── TodoApp.tsx    # Demo todo application
│   │   └── GenSXCopilot.tsx # Copilot component
│   └── hooks/
│       └── useChat.ts     # Custom hook for chat functionality
└── package.json
```

## How It Works

1. **Tool Definitions**: Tools are defined using Zod schemas in `toolbox.ts`
2. **Tool Implementations**: Actual jQuery-based implementations are in `GenSXCopilot.tsx`
3. **Workflow**: The AI workflow in `workflows.ts` uses these tools to interact with the page
4. **Real-time Updates**: Uses GenSX's `publishObject` to stream updates to the UI
5. **API Integration**: Custom API routes handle communication between the frontend and GenSX

## Environment Variables

You can configure the following environment variables:

- `GENSX_ORG` - Your GenSX organization ID
- `GENSX_PROJECT` - Your GenSX project ID
- `GENSX_ENV` - Your GenSX environment name
- `GENSX_TOKEN` - Your GenSX API token

When these are not set, the example will use the local dev server.

## Extending the Example

To add new tools:

1. Define the tool schema in `gensx/tools/toolbox.ts`
2. Implement the tool in `src/components/GenSXCopilot.tsx`
3. The tool will automatically be available to the AI

## Learn More

- [GenSX Documentation](https://docs.gensx.com)
- [jQuery Documentation](https://api.jquery.com)