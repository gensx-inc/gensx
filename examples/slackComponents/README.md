# Slack Components Example

This example demonstrates how to use GenSX with Slack's Web API to interact with Slack channels and send messages.

## What it demonstrates

- Using Slack Web API to list channels and send messages
- Creating reusable GenSX components for Slack interactions

## Usage

```bash
# Install dependencies
pnpm install

# Set your Slack Bot Token
export SLACK_BOT_TOKEN=<your_bot_token>

# Run the example
pnpm run start
```

The example will:

1. Initialize the Slack Web client using your bot token
2. Fetch available public channels
3. Send a test message to the first available channel
4. Return the message timestamp upon successful delivery

## Development

To run in development mode with hot reloading:

```bash
pnpm run dev
```

## Project Structure

- `src/index.tsx` - Main entry point demonstrating component usage
- `src/slack.tsx` - Slack component implementations (SlackChannels and SlackMessage)
