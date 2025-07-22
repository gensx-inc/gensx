# Draft Pad - GenSX Real-time Editor Example

[![Use this template](https://img.shields.io/badge/use%20this%20template-black?style=for-the-badge&logo=github)](https://github.com/gensx-inc/draft-pad-template/generate)

A real-time collaborative draft editor powered by GenSX workflows. This example demonstrates how to build a Next.js application that integrates with GenSX for real-time AI-powered content generation and editing.

## Features

- 🔄 **Real-time streaming**: Content updates in real-time as the GenSX workflow processes
- 💬 **Interactive chat**: Conversational interface with full history
- 📝 **Draft versioning**: Track changes and navigate between versions
- 🎯 **Live progress**: See workflow progress with detailed event tracking
- 🚀 **GenSX integration**: Direct connection to deployed GenSX workflows

## Environment Variables

To use different AI providers, you'll need to set up the following environment variables:

### OpenAI

```
OPENAI_API_KEY=your-openai-api-key
```

### Anthropic (Claude)

```
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### Google (Gemini)

```
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
```

### Mistral

```
MISTRAL_API_KEY=your-mistral-api-key
```

### Cohere

```
COHERE_API_KEY=your-cohere-api-key
```

### Amazon Bedrock (AWS)

```
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
```

### Azure OpenAI

```
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
```

### DeepSeek

```
DEEPSEEK_API_KEY=your-deepseek-api-key
```

### Groq

```
GROQ_API_KEY=your-groq-api-key
```

### xAI (Grok)

```
XAI_API_KEY=your-xai-api-key
```

## Installation

```bash
# From the gensx monorepo root
cd examples/draft-pad
pnpm install
```

## Setup

### 1. Environment Configuration

Create a `.env.local` file in this directory:

```bash
# GenSX API Configuration
# Get your API key from https://gensx.com/dashboard/api-keys
GENSX_API_KEY=your_gensx_api_key_here

# GenSX Workflow Configuration
GENSX_ORG=your-org-name
GENSX_PROJECT=your-project-name
GENSX_ENVIRONMENT=production
GENSX_WORKFLOW_NAME=update-draft

# Optional: Override the default GenSX base URL
# GENSX_BASE_URL=https://api.gensx.com
```

### 2. Deploy Your GenSX Workflow

Your GenSX workflow should accept the following inputs:

```json
{
  "userMessage": "string", // User's instruction/message
  "currentDraft": "string", // Current draft content
  "previousMessages": "array", // Chat history
  "model": "string" // AI model to use
}
```

And emit progress events with these types:

- `assistantMessage` - For AI response content
- `draftContent` - For updated draft content
- `start` - When sections begin
- `end` - When sections complete

### 3. Install and Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Architecture

### Workflow Integration

The app uses the `useWorkflow` hook from `@gensx/react` package for real-time workflow streaming:

```typescript
import { useWorkflow } from "@gensx/react";

// Real-time workflow connection
const workflow = useWorkflow({
  endpoint: "/api/gensx",
  workflowName: "update-draft",
  onComplete: (result) => console.log("Workflow completed"),
  onError: (error) => console.error("Workflow error:", error),
});

// Track specific event types with real-time callbacks
const assistantEvents = workflow.useProgressEvents("assistantMessage");

// Stream workflow with inputs
await workflow.stream({
  userMessage: "Update the draft",
  currentDraft: "Current content...",
});
```

### API Routes

- `POST /api/gensx` - Main workflow endpoint that forwards requests to GenSX
  - Handles streaming responses with real-time progress events
  - Configurable via environment variables (no hardcoded values)
  - Supports conversation history and draft versioning

### Event Flow

1. User types message → Frontend calls `/api/gensx`
2. Backend calls GenSX workflow with real credentials
3. GenSX streams progress events back
4. Frontend processes events in real-time via `useWorkflow` hook
5. UI updates live as content streams in

## Development

### Local Development Without GenSX

For local development without a deployed GenSX workflow, you can:

1. Mock the API endpoints
2. Use the workflow examples in `apps/gensx-workflows/examples/`
3. Create test workflows that emit the expected event structure

### Debug Mode

Set `NODE_ENV=development` to see debug information including:

- Workflow status
- Event counts
- Real-time progress metrics

## Production Deployment

1. Deploy your GenSX workflow to the GenSX platform
2. Update the config with your real org/project/workflow names
3. Set the `GENSX_API_KEY` environment variable
4. Deploy the web app

The app will automatically connect to your deployed GenSX workflow and provide real-time collaborative editing.

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your `GENSX_API_KEY` is correct
2. **Workflow not found**: Verify org/project/workflow names in config
3. **No streaming events**: Ensure your workflow emits the expected event types
4. **CORS issues**: Check your GenSX project settings

### Debug Tips

- Check browser console for workflow events
- Monitor network tab for API calls
- Use the debug panel (development mode only)
- Check GenSX dashboard for workflow execution logs
