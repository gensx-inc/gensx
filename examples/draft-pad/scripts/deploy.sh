#!/bin/bash

# Deploys the project using environment variables for configuration.

set -e

# Check for required environment variables
if [ -z "$GENSX_API_KEY" ]; then
  echo "❌ Error: GENSX_API_KEY environment variable is required"
  exit 1
fi

# Build the command with required variables
CMD="npx gensx@latest deploy ./gensx/workflows.ts --project draft-pad --env production --yes"

# Build environment variable flags array
ENV_FLAGS=()

# Add required GenSX API key
ENV_FLAGS+=("-e" "GENSX_API_KEY=$GENSX_API_KEY")

# Add optional GenSX configuration
[ -n "$GENSX_BASE_URL" ] && ENV_FLAGS+=("-e" "GENSX_BASE_URL=$GENSX_BASE_URL")
[ -n "$GENSX_CONSOLE_URL" ] && ENV_FLAGS+=("-e" "GENSX_CONSOLE_URL=$GENSX_CONSOLE_URL")
[ -n "$GENSX_ORG" ] && ENV_FLAGS+=("-e" "GENSX_ORG=$GENSX_ORG")

# Add model API keys only if they exist
[ -n "$OPENAI_API_KEY" ] && ENV_FLAGS+=("-e" "OPENAI_API_KEY=$OPENAI_API_KEY")
[ -n "$ANTHROPIC_API_KEY" ] && ENV_FLAGS+=("-e" "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
[ -n "$GROQ_API_KEY" ] && ENV_FLAGS+=("-e" "GROQ_API_KEY=$GROQ_API_KEY")
[ -n "$DEEPSEEK_API_KEY" ] && ENV_FLAGS+=("-e" "DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY")
[ -n "$XAI_API_KEY" ] && ENV_FLAGS+=("-e" "XAI_API_KEY=$XAI_API_KEY")
[ -n "$MISTRAL_API_KEY" ] && ENV_FLAGS+=("-e" "MISTRAL_API_KEY=$MISTRAL_API_KEY")
[ -n "$COHERE_API_KEY" ] && ENV_FLAGS+=("-e" "COHERE_API_KEY=$COHERE_API_KEY")
[ -n "$GOOGLE_GENERATIVE_AI_API_KEY" ] && ENV_FLAGS+=("-e" "GOOGLE_GENERATIVE_AI_API_KEY=$GOOGLE_GENERATIVE_AI_API_KEY")

# Add AWS credentials only if they exist
[ -n "$AWS_ACCESS_KEY_ID" ] && ENV_FLAGS+=("-e" "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID")
[ -n "$AWS_SECRET_ACCESS_KEY" ] && ENV_FLAGS+=("-e" "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY")
[ -n "$AWS_REGION" ] && ENV_FLAGS+=("-e" "AWS_REGION=$AWS_REGION")

# Add Azure OpenAI credentials only if they exist
[ -n "$AZURE_OPENAI_API_KEY" ] && ENV_FLAGS+=("-e" "AZURE_OPENAI_API_KEY=$AZURE_OPENAI_API_KEY")
[ -n "$AZURE_OPENAI_ENDPOINT" ] && ENV_FLAGS+=("-e" "AZURE_OPENAI_ENDPOINT=$AZURE_OPENAI_ENDPOINT")
[ -n "$AZURE_OPENAI_API_VERSION" ] && ENV_FLAGS+=("-e" "AZURE_OPENAI_API_VERSION=$AZURE_OPENAI_API_VERSION")

# Run the deployment command with the environment variable flags
$CMD "${ENV_FLAGS[@]}"
