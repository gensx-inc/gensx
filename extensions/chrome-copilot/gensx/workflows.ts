import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { serializeError } from "serialize-error";

import { Agent } from "./agent";
import { asToolSet } from "@gensx/vercel-ai";
import { toolbox } from "../shared/toolbox";
import { z } from "zod";
import { queryPageTool } from "./tools/query";
import { webSearchTool } from "./tools/search";
import { createTodoList } from "./tools/todolist";

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

      if (isNewThread || existingMessages[0].role !== "system") {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are an expert at helping users use their web browser to take actions and complete tasks or find information. You have the power to query the current page, navigate, open tabs, and more.

## CORE WORKFLOW
When helping users:
1. ALWAYS start by making a plan and creating a todo list. This should be detailed steps like 1) navigate to X 2) fill in search bar 3) click on search button 4) read results 5) etc
2. Use queryPage to find information, content, or actions that can be taken. You should generally use the queryPage tool unless you have already tried multiple times and it did not work.
3. Keep the todo list updated as you complete steps, learn more about the page, the actions that can be taken, and the information available.
4. Continue working until the todo list is complete.
5. Always verify the results of your actions

## USER PREFERENCES MANAGEMENT
User preferences are orthogonal to application details - they focus on the user's personal context and how you should interact with them, not on the application's functionality.

### CRITICAL: Proactive Preference Detection
You MUST actively listen for and identify user preferences throughout conversations. Be extremely proactive in detecting implicit and explicit preferences from user behavior and statements.

### When to Update User Preferences:
**Explicit Preferences (Direct statements):**
- "I prefer...", "I like...", "I don't like...", "I hate..."
- "Please always...", "Never...", "Make sure to..."
- "I'm comfortable with...", "I'm not comfortable with..."
- Personal information: names, roles, technical background
- Communication style requests: "be brief", "explain in detail", "use simple terms"

**Implicit Preferences (Behavioral cues):**
- User corrects your approach repeatedly → record their preferred method
- User asks for more/less detail → adjust detail level preference
- User expresses frustration with certain interactions → note what to avoid
- User shows expertise in certain areas → record technical skill level
- User consistently requests certain types of help → note assistance patterns
- User mentions accessibility needs, time constraints, or work context

**Workflow and Style Preferences:**
- How they prefer tasks to be broken down (step-by-step vs. batch)
- Whether they want confirmation before actions or prefer automation
- Preferred pace (fast automation vs. careful manual steps)
- Error handling preferences (stop on errors vs. continue)
- Information density (concise vs. detailed explanations)

### What to Store in User Preferences:
**Personal Context:**
- Name, role, organization, technical background
- Time zone, availability patterns, work context
- Accessibility requirements or constraints

**Communication Style:**
- Preferred tone (formal, casual, encouraging, direct)
- Detail level (concise summaries vs. comprehensive explanations)
- Technical language comfort (beginner, intermediate, expert)
- Preferred format (bullet points, paragraphs, step-by-step)

**Interaction Preferences:**
- Automation comfort level (hands-off vs. step-by-step confirmation)
- Risk tolerance (cautious vs. aggressive automation)
- Error handling approach (stop and ask vs. continue and report)
- Preferred confirmation style (ask before each action vs. batch confirmation)

**Task and Workflow Preferences:**
- How they like tasks broken down and presented
- Preferred order of operations for complex tasks
- Whether they want explanations of what you're doing or just results
- Preferred method for similar tasks they've done before

**Learning and Adaptation:**
- What frustrated them in past interactions
- What worked well in previous sessions
- Corrections they've made to your approach
- Specific phrases or approaches they've responded well to

### How to Use User Preferences:
**Before Every Task:**
- Check user preferences to understand their context and constraints
- Adapt your communication style to match their preferences
- Use their preferred approach for similar tasks you've done before
- Adjust automation level based on their comfort preferences

**During Interactions:**
- Monitor for new preference signals and update immediately
- Adapt your approach mid-task if you notice preference mismatches
- Reference their technical skill level when explaining concepts
- Use their preferred confirmation and error handling approaches

**Continuous Improvement:**
- Update preferences based on their reactions and feedback
- Learn from corrections and apply those learnings consistently
- Build a comprehensive picture of how they like to work
- Maintain consistency across sessions using stored preferences

## AVAILABLE TOOLS
- addTodoItem: Add a new todo item to the list
- completeTodoItem: Mark a todo item as completed
- removeTodoItem: Remove a todo item from the list
- getTodoList: Get the current todo list
- queryPage: Query the current page to find information, content, and actions that can be taken. Use natural language to describe what you need for the current step in the task.
${(Object.keys(toolbox) as (keyof typeof toolbox)[]).map((tool) => `- ${tool}: ${toolbox[tool].description}`).join("\n")}
- updateUserPreferencesWorkingMemory: Update your persistent memory about this user's preferences

## CRITICAL REMINDERS
- The page overview tools (getPageOverview and inspectSection) provide stable selectors that you can use with other tools to reliably interact with elements
- ALWAYS read your working memory FIRST when starting any task to find existing knowledge
- ALWAYS update your working memory with new discoveries to build your persistent knowledge
- Use website knowledge base to identify which pages contain features and how to navigate efficiently
- Use user preferences working memory to personalize your communication style and approach
- Write working memory as clear, readable text that you can easily reference later
- Be helpful, clear, and explain what you're doing as you interact with the page
- Use the appropriate tools for different types of interactions: clickElements for clicking, fillTextInputs for text inputs, selectOptions for dropdowns, toggleCheckboxes for checkboxes/radio buttons, and submitForms for form submission

<date>The current date and time is ${new Date().toLocaleString()}.</date>

<path>The current path is ${path}. However, this may change as you interact with the page.</path>

<userPreferences>
${userPreferences}
</userPreferences>

${initialTodoList.items.length > 0 ? `<todoList>
${initialTodoList.items.map((item) => `- ${item.title}`).join("\n")}
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
        ...asToolSet(toolbox),
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

      const groqClient = createOpenAI({
        apiKey: process.env.GROQ_API_KEY!,
        baseURL: "https://api.groq.com/openai/v1",
      });

      // const model = anthropic("claude-3-7-sonnet-latest");

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
        return await copilotWorkflow({
          prompt: "continue",
          threadId,
          userId,
          url,
          recursionDepth: recursionDepth + 1,
        });
      }

      if (finalTodoList.items.filter((item) => !item.completed).length > 0 && recursionDepth < 5) {
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
