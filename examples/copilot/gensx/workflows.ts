import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { Agent } from "./agent";
import { asToolSet } from "@gensx/vercel-ai";
import { toolbox } from "./tools/toolbox";

type ThreadData = {
  messages: CoreMessage[];
};

export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({
    prompt,
    threadId,
    userId,
  }: {
    prompt: string;
    threadId?: string;
    userId?: string;
  }) => {
    threadId = threadId ?? "default";
    userId = userId ?? "default";

    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<ThreadData>(
      `chat-history/${userId}/${threadId}.json`,
    );

    // Function to load thread data
    const loadThreadData = async (): Promise<ThreadData> => {
      const data = await chatHistoryBlob.getJSON();

      // Handle old format (array of messages) - convert to new format
      if (Array.isArray(data)) {
        return { messages: data };
      }

      return data ?? { messages: [] };
    };

    // Function to save thread data
    const saveThreadData = async (threadData: ThreadData): Promise<void> => {
      await chatHistoryBlob.putJSON(threadData);
    };

    const threadData = await loadThreadData();
    const existingMessages = threadData.messages;

    // Check if this is a new thread (no messages yet)
    const isNewThread = existingMessages.length === 0;

    if (isNewThread) {
      const systemMessage: CoreMessage = {
        role: "system",
        content: `You are a helpful AI assistant with the ability to interact with web pages using jQuery-based tools.
You can inspect elements, click buttons, fill forms, and help users navigate and interact with web applications.

When helping users:
1. First, use getPageOverview to get a hierarchical understanding of the page structure
2. Use inspectSection to drill down into specific sections for detailed analysis
3. Use inspectElement to get details about individual elements
4. Use highlightElement to show users what you're looking at
5. Perform actions like clicking or filling forms as requested
6. Always verify the results of your actions

Available tools:
- getPageOverview: Provides a hierarchical overview of the page with sections, interaction patterns, and reliable selectors
- inspectSection: Analyzes a specific section in detail, including all interactive elements
- inspectElement: Gets detailed information about a specific element
- clickElement: Clicks on an element
- fillForm: Fills form inputs
- submitForm: Submits a form
- highlightElement: Visually highlights an element
- waitForElement: Waits for an element to appear

The page overview tools (getPageOverview and inspectSection) provide stable selectors that you can use with other tools to reliably interact with elements.

Be helpful, clear, and explain what you're doing as you interact with the page.

<date>The current date and time is ${new Date().toLocaleString()}.</date>`,
      };

      existingMessages.push(systemMessage);
    } else if (
      existingMessages[0].role === "system" &&
      typeof existingMessages[0].content === "string"
    ) {
      // update the system message with the current date and time
      existingMessages[0].content = existingMessages[0].content.replace(
        /<date>.*<\/date>/,
        `<date>The current date and time is ${new Date().toLocaleString()}.</date>`,
      );
    }

    // Add the new user message
    const messages: CoreMessage[] = [
      ...(existingMessages as CoreMessage[]),
      {
        role: "user",
        content: prompt,
      },
    ];

    const tools = asToolSet(toolbox);

    const groqClient = createOpenAI({
      apiKey: process.env.GROQ_API_KEY!,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const model = groqClient("moonshotai/kimi-k2-instruct");
    const result = await Agent({
      messages,
      tools,
      model,
      // providerOptions: thinking
      //   ? {
      //       anthropic: {
      //         thinking: { type: "enabled", budgetTokens: 12000 },
      //       } satisfies AnthropicProviderOptions,
      //     }
      //   : undefined,
    });

    await saveThreadData({ messages: result.messages });

    return result;
  },
);
