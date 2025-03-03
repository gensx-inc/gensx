import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { GSXTool } from "@gensx/openai";
import { gsx } from "gensx";
import { z } from "zod";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

const ShoppingAgent = gsx.Component<
  { messages: Message[] },
  { messages: Message[] }
>("ShoppingAgent", ({ messages }) => {
  return (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <ChatCompletion
        messages={[
          {
            role: "system",
            content:
              "You are a shopping agent. You can help the user shop for groceries. You should first decide which store to shop at, then fetch the products from the store. If something is not available, you should ask the user for an alternative.",
          },
          ...messages,
        ]}
        model="gpt-4o"
        tools={[decideStoreTool, fetchProductTool]}
      />
    </OpenAIProvider>
  );
});

const shoppingAgentWorkflow = gsx.Workflow(
  "shoppingAgentWorkflow",
  ShoppingAgent,
);

export const shoppingAgentTool = new GSXTool({
  name: "shoppingAgent",
  description: `A tool for shopping for groceries. You can ask the shopping agent to buy you something, or discuss a shopping list with them.
This tool is conversational, so you communicate with the agent using the messages array and natural language. In the context of this conversation, you are the user, and the shopping agent is an AI assistant.
This tool is stateless, so you must provide the entire list of messages each time. This means you should include the messages you sent to the tool previously, the response received, and your new response.

The agent may tell you something is not available and ask for an alternative. Respond to the agent's questions with alternative suggestions.`,
  schema: z.object({
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
  }),
  run: async (input) => {
    const result = await shoppingAgentWorkflow.run(input);
    return result;
  },
});

const STORES = ["Safeway", "Costco", "Walmart", "Target", "Kroger"];
const decideStoreTool = new GSXTool({
  name: "decideStore",
  description: "A tool for deciding which store to shop at.",
  schema: z.object({
    shoppingList: z.array(z.string()),
  }),
  run: () => {
    const store = STORES[Math.floor(Math.random() * STORES.length)];
    return Promise.resolve({ store });
  },
});

const fetchProductTool = new GSXTool({
  name: "fetchProduct",
  description: "A tool for getting a product from a store.",
  schema: z.object({
    store: z.string(),
    product: z.string(),
  }),
  run: ({ store, product }) => {
    if (Math.random() > 0.8) {
      return Promise.resolve(`Product ${product} not found at ${store}`);
    }
    return Promise.resolve(`Product ${product} found at ${store}`);
  },
});
