import { gsx } from "gensx";
import { SlackChannels, SlackMessage } from "./slack.js";

const result = await gsx.execute<string>(
  <SlackChannels>
    {({ channels }) => (
      <SlackMessage
        channelId={channels?.[0].id || ""}
        message="What is the weather in Tokyo?"
      />
    )}
  </SlackChannels>,
);

console.log(result);
