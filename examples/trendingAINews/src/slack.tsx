import { gsx } from "gensx";
import { WebClient } from "@slack/web-api";

type SlackMessageProps = {
  channelId: string;
  message: string;
  token?: string;
};

type SlackMessageOutput = {
  success: boolean;
  messageTs?: string;
  error?: string;
};

export const SlackMessage = gsx.Component<
  SlackMessageProps,
  SlackMessageOutput
>("SlackMessage", async ({ channelId, message, token }) => {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN environment variable is not set");
    }
    token = process.env.SLACK_BOT_TOKEN;
    const client = new WebClient(token);

    const result = await client.chat.postMessage({
      channel: channelId,
      text: message,
    });

    return {
      success: true,
      messageTs: result.ts as string,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
});

type SlackChannelsOutput = {
  success: boolean;
  channels?: Array<{
    id: string;
    name: string;
  }>;
  error?: string;
};

export const SlackChannels = gsx.Component<
  { token?: string },
  SlackChannelsOutput
>("GetSlackChannels", async ({ token }) => {
  try {
    if (!token && !process.env.SLACK_BOT_TOKEN) {
      throw new Error("SLACK_BOT_TOKEN environment variable is not set");
    }
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);

    const result = await client.conversations.list({
      exclude_archived: true,
      types: "public_channel",
    });

    return {
      success: true,
      channels: result.channels?.map((channel: any) => ({
        id: channel.id,
        name: channel.name,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
});
