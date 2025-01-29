import { gsx } from "gensx";
import { Client } from "twitter-api-sdk";

// Create the X context
export const XContext = gsx.createContext<{
  client?: Client;
}>({});

interface XConfig {
  bearerToken: string;
}

// Create the X Provider
export const XProvider = gsx.Component<XConfig, never>(
  "XProvider",
  (args: XConfig) => {
    const client = new Client(args.bearerToken);
    return <XContext.Provider value={{ client }} />;
  },
);

interface TweetsByUsernameProps {
  username: string;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
}

// Create a component that uses the provider
export const TweetsByUsername = gsx.Component<TweetsByUsernameProps, Tweet[]>(
  "TweetsByUsername",
  async ({ username }) => {
    const context = gsx.useContext(XContext);

    if (!context.client) {
      throw new Error(
        "X client not found. Please wrap your component with XProvider.",
      );
    }
    const user = await context.client.users.findUserByUsername(username);

    if (!user.data) {
      throw new Error(`Failed to find user: ${username}`);
    }

    const tweets = await context.client.tweets.usersIdTweets(user.data.id, {
      "tweet.fields": ["created_at", "text"],
      max_results: 5,
    });

    if (!tweets.data) {
      throw new Error(`Failed to fetch tweets for user: ${username}`);
    }

    return tweets.data.map((tweet) => ({
      id: tweet.id,
      text: tweet.text ?? "",
      created_at: tweet.created_at ?? "",
    }));
  },
);
