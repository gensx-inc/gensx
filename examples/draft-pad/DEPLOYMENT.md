# Deploying Draft-Pad to Vercel with GenSX Workflows

This guide explains how to deploy the Draft-Pad application to Vercel with automatic GenSX workflow deployment.

## Prerequisites

1. A Vercel account
2. A GenSX account with API access
3. The GenSX CLI installed (it will be installed automatically via npx)

## Setup Steps

### 1. Configure GenSX Authentication

First, you need to authenticate with GenSX locally to create your project:

```bash
npx gensx@latest login
```

### 2. Create Your GenSX Project

Create the project in GenSX Cloud:

```bash
npx gensx@latest project create draft-pad
```

### 3. Set Environment Variables in Vercel

In your Vercel project settings, add the following environment variables:

- `GENSX_API_KEY`: Your GenSX API key (get this from the GenSX dashboard)
- `GENSX_TOKEN`: Your GenSX auth token (get this from `~/.gensx/credentials.json` after login)
- `NODE_ENV`: Set to `production`

Optional:

- `GENSX_BASE_URL`: Only if using a custom GenSX instance (defaults to https://api.gensx.com)

### 4. Update Your Deployment Configuration

The `package.json` has been configured to automatically deploy workflows during the build process:

```json
{
  "scripts": {
    "build": "npm run deploy-workflow && next build",
    "deploy-workflow": "npx gensx@latest deploy ./gensx/workflows.ts --project draft-pad --env production --yes"
  }
}
```

### 5. Configure GenSX CLI for CI/CD

Since the GenSX CLI needs authentication in the CI environment, create a `.gensx/credentials.json` file structure:

```bash
mkdir -p .gensx
```

Then create a build script that sets up credentials:

The `scripts/setup-gensx-ci.sh` script will automatically set up GenSX credentials from environment variables during the build process.

## Method 2: Using GitHub Actions (Alternative)

If you prefer using GitHub Actions for deployment, create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel with GenSX

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install

      - name: Deploy GenSX Workflow
        env:
          GENSX_TOKEN: ${{ secrets.GENSX_TOKEN }}
          GENSX_API_KEY: ${{ secrets.GENSX_API_KEY }}
        run: |
          chmod +x ./scripts/setup-gensx-ci.sh
          npm run deploy-workflow

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: "--prod"
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Getting Your Credentials

### GenSX Credentials

1. **API Key**:

   - Log into the GenSX dashboard
   - Navigate to Settings → API Keys
   - Create a new API key
   - This is the only credential you need for deployment

### Vercel Credentials (for GitHub Actions)

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Get your credentials:
   ```bash
   # Get org ID and project ID from .vercel/project.json
   cat .vercel/project.json
   ```

## Deployment Flow

When you deploy (either via `git push` or Vercel dashboard):

1. The build script runs `npm run deploy-workflow`
2. This executes `setup-gensx-ci.sh` to configure credentials
3. Then runs `gensx deploy` to push the workflow to GenSX Cloud
4. Finally, Next.js builds the application
5. Vercel deploys the built application

## Troubleshooting

### Authentication Errors

If you see "Not authenticated" errors:

- Verify `GENSX_API_KEY` is set in Vercel
- Ensure the API key has the correct permissions

### Project Not Found

If you see "Project not found" errors:

- Make sure you've created the project: `npx gensx@latest project create draft-pad`
- Verify the project name matches in `package.json`
- Check that your GenSX organization has access to the project

### Build Failures

If the workflow deployment fails:

- Check the build logs in Vercel for specific error messages
- Ensure all required environment variables for your AI providers are set
- Verify the workflow file path is correct

## Environment Variables for AI Providers

Don't forget to add API keys for the AI providers you're using:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `MISTRAL_API_KEY`
- `COHERE_API_KEY`
- `GROQ_API_KEY`
- `XAI_API_KEY`
- etc.

## Local Testing

To test the deployment process locally:

```bash
# Set up environment variables
export GENSX_API_KEY="your-api-key"

# Run the deployment
npm run deploy-workflow
```
