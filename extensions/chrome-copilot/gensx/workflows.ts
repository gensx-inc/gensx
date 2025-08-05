import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { CoreMessage } from "ai";
import { serializeError } from "serialize-error";

import { Agent } from "./agent";
import { getFilteredTools, toolbox } from "../shared/toolbox";
import { z } from "zod";
import { queryPageTool } from "./tools/query";
import { webSearchTool } from "./tools/search";
import { createTodoList } from "./tools/todolist";
import { anthropic } from "@ai-sdk/anthropic";
import { asToolSet } from "@gensx/vercel-ai";

const toolsToRemove: (keyof typeof toolbox)[] = ["fetchPageText"];

type ThreadData = {
  messages: CoreMessage[];
  todoList: {
    items: {
      title: string;
      completed: boolean;
    }[];
  };
};

export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({
    prompt,
    threadId,
    userId,
    url,
    recursionDepth = 0,
  }: {
    prompt: string;
    threadId: string;
    userId: string;
      url: string;
    recursionDepth?: number
  }): Promise<{ response: string; messages: CoreMessage[] }> => {
    try {
      // Get blob instance for chat history storage
      const chatHistoryBlob = useBlob<ThreadData>(
        chatHistoryBlobPath(userId, threadId),
      );

      const path = new URL(url).pathname;
      const userPreferencesBlob = useBlob(`user-preferences/${userId}`);

      // Function to load thread data
      const loadThreadData = async (): Promise<ThreadData> => {
        const data = await chatHistoryBlob.getJSON();

        return data ?? { messages: [], todoList: { items: [] } };
      };

      // Function to save thread data
      const saveThreadData = async (threadData: ThreadData): Promise<void> => {
        await chatHistoryBlob.putJSON(threadData);
      };

      const threadData = await loadThreadData();
      const existingMessages = threadData.messages;

      let userPreferences = "";

      try {
        // Load user preferences working memory scratchpad
        const userPrefsExists = await userPreferencesBlob.exists();
        if (userPrefsExists) {
          userPreferences =
            (await userPreferencesBlob.getString()) ?? "";
        }
      } catch (error) {
        console.error("Error loading working memory", error);
      }

      if (!userPreferences.trim()) {
        userPreferences = "No user preferences stored yet.";
      }

      // Check if this is a new thread (no messages yet)
      const isNewThread = existingMessages.length === 0;

      const initialTodoList = threadData.todoList;

      const toolsForModel = getFilteredTools(toolsToRemove);

      if (isNewThread || existingMessages[0].role !== "system") {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are an expert at helping users use their web browser to take actions and complete tasks or find information. You have the power to query the current page, navigate, open tabs, and more.

## TODO LIST MANAGEMENT
You MUST use the todo list as your primary task management system for all tasks.

### Workflow:
1. **Start every task by creating a comprehensive todo list** - Break down the user's request into specific, actionable steps
2. **Structure your todo items as:**
   - Specific actions (e.g., "Navigate to search page", "Enter search term 'X'", "Click search button")
   - Verification steps (e.g., "Verify search results appear")
   - Error handling when needed (e.g., "If search fails, try alternative terms")
3. **Actively maintain the list:**
   - Mark items as completed IMMEDIATELY after each step
   - Add new items when you discover additional steps needed
   - Remove irrelevant items, reorder if the plan changes
4. **Continue until ALL items are completed** - Don't stop until every item is marked complete

### Todo Tools:
- addTodoItem: Add new todo items when you discover additional steps
- completeTodoItem: Mark items completed immediately after each step
- removeTodoItem: Remove irrelevant or duplicate items
- getTodoList: Check your progress and plan next steps

## PAGE INTERACTION
1. Use queryPage to find information, content, or available actions
2. As you complete steps you can navigate to the next page or tab as needed.
3. Always verify the results of your actions
4. Add new todo items if you encounter errors or unexpected results

## USER PREFERENCES
Proactively detect and store user preferences to personalize your interactions.

### When to Update Preferences:
- **Explicit preferences:** "I prefer...", "Please always...", communication style requests
- **Implicit preferences:** User corrections, frustration patterns, expertise level, assistance patterns
- **Personal context:** Name, role, technical background, accessibility needs
- **Interaction style:** Automation comfort, error handling approach, detail level preferences

### Store and Use:
- Adapt communication style to match their preferences
- Use their preferred approaches for similar tasks
- Monitor for new preference signals and update immediately
- Learn from corrections and apply consistently

## AVAILABLE TOOLS

### Todo List Tools:
- addTodoItem, completeTodoItem, removeTodoItem, getTodoList

### Page Interaction Tools:
- queryPage: Query the current page with natural language. This is the best tool for finding information, content, or available actions on the current page.
- search: Web search for relevant information
${(Object.keys(toolsForModel) as (keyof typeof toolbox)[]).map((tool) => `- ${tool}: ${toolbox[tool].description}`).join("\n")}
- updateUserPreference: Update persistent memory about user preferences

### Searching vs Navigating
- Use search when you need to find information that is not on the current page.
- Use navigate when you need to go to a different page or tab.
- Prefer navigating when you are looking for specific singular information from a page, and search when you are looking for multiple results.

## Key Reminders:
- Create and maintain todo lists for every task
- Mark todo items complete immediately after each step
- Read user preferences first, update with new discoveries
- Use appropriate tools for interactions (clickElements, fillTextInputs, etc.)
- Be clear and explain what you're doing

<date>The current date and time is ${new Date().toLocaleString()}.</date>

<path>The current path is ${path}. However, this may change as you interact with the page.</path>

<userPreferences>
${userPreferences}
</userPreferences>

${initialTodoList.items.length > 0 ? `<todoList>
${initialTodoList.items.map((item, index) => `- ${index}. [${item.completed ? "x" : " "}] ${item.title}`).join("\n")}
</todoList>` : ""}`,
        };

        existingMessages.unshift(systemMessage);
      } else if (
        existingMessages[0].role === "system" &&
        typeof existingMessages[0].content === "string"
      ) {
        // update the system message with the current date and time
        existingMessages[0].content = existingMessages[0].content.replace(
          /<date>.*<\/date>/,
          `<date>The current date and time is ${new Date().toLocaleString()}.</date>`,
        );
        existingMessages[0].content = existingMessages[0].content.replace(
          /<path>.*<\/path>/,
          `<path>The current path is ${path}. However, this may change as you interact with the page.</path>`,
        );

        // Update user preferences working memory
        existingMessages[0].content = existingMessages[0].content.replace(
          /<userPreferencesWorkingMemory>.*<\/userPreferencesWorkingMemory>/,
          `<userPreferencesWorkingMemory>
${userPreferences}
</userPreferencesWorkingMemory>`,
        );

        existingMessages[0].content = existingMessages[0].content.replace(
          /<todoList>.*<\/todoList>/,
          `<todoList>
${initialTodoList.items.map((item) => `- [${item.completed ? "x" : " "}] ${item.title}`).join("\n")}
</todoList>`,
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

      const { tools: todoListTools, getFinalTodoList } = createTodoList(initialTodoList);

      const tools = {
        ...asToolSet(toolsForModel),
        search: webSearchTool,
        ...todoListTools,
        queryPage: queryPageTool,
        updateUserPreference: {
          execute: async (params: { content: string }) => {
            const { content } = params;

            try {
              await userPreferencesBlob.putString(content);
              return {
                success: true,
              };
            } catch (error) {
              console.error(
                "Error updating user preferences",
                error,
              );
              return {
                success: false,
                error: "Error updating user preferences",
              };
            }
          },
          parameters: z.object({
            content: z
              .string()
              .describe(
                "The complete content for user preferences. This replaces the entire content. Write it as a readable block of text that you can reference later.",
              ),
          }),
          description:
            "Update your working memory for user preferences. This is your persistent memory about how the user likes to interact, their preferences, constraints, and personal context. Write it as a readable block of text that you can reference later.",
        },
      };

      // const groqClient = createOpenAI({
      //   apiKey: process.env.GROQ_API_KEY!,
      //   baseURL: "https://api.groq.com/openai/v1",
      // });

      const model = anthropic("claude-3-7-sonnet-latest");

      // const model = groqClient("moonshotai/kimi-k2-instruct");
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

      let continueForTools = false;
      const lastMessage = result.messages[result.messages.length - 1];
      if (
        typeof lastMessage.content === "string" &&
        (lastMessage.content.trim().endsWith("<|tool_calls_section_end|>") || lastMessage.content.trim().endsWith("<|tool_calls_section_begin|>"))
      ) {
        // sometimes the k2 model will end the message with a tool call section begin or end marker and stop, so we need to continue for tools
        continueForTools = true;
      }

      const finalTodoList = getFinalTodoList();
      await saveThreadData({ messages: result.messages, todoList: finalTodoList });

      if (continueForTools && recursionDepth < 5) {
        console.warn("continuing for tools", finalTodoList);
        return await copilotWorkflow({
          prompt: "continue",
          threadId,
          userId,
          url,
          recursionDepth: recursionDepth + 1,
        });
      }

      if (finalTodoList.items.filter((item) => !item.completed).length > 0 && recursionDepth < 5) {
        console.warn("todo list is not complete, continuing", finalTodoList);
        return await copilotWorkflow({
          prompt: "todo list is not complete, continue working on it.",
          threadId,
          userId,
          url,
          recursionDepth: recursionDepth + 1,
        });
      }

      return result;
    } catch (error) {
      console.error(
        "Error in copilot workflow",
        JSON.stringify(serializeError(error), null, 2),
      );
      throw error;
    }
  },
);

function chatHistoryBlobPath(userId: string, threadId: string): string {
  return `chat-history/${userId}/${threadId}.json`;
}

export const getChatHistoryWorkflow = gensx.Workflow(
  "fetchChatHistory",
  async ({ userId, threadId }: { userId: string; threadId: string }) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<ThreadData>(
      chatHistoryBlobPath(userId, threadId),
    );

    // Function to load thread data
    const loadThreadData = async (): Promise<ThreadData> => {
      const data = await chatHistoryBlob.getJSON();

      // Handle old format (array of messages) - convert to new format
      if (Array.isArray(data)) {
        return { messages: data, todoList: { items: [] } };
      }

      return data ?? { messages: [], todoList: { items: [] } };
    };

    return await loadThreadData();
  },
);
