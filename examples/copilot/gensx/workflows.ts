import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { serializeError } from "serialize-error";

import { Agent } from "./agent";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { toolbox } from "./tools/toolbox";
import { z } from "zod";
import { initPrompt } from "./slashcommands/init";

type ThreadData = {
  messages: CoreMessage[];
};

export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({
    prompt,
    threadId,
    userId,
    url,
  }: {
    prompt: string;
    threadId: string;
    userId: string;
    url: string;
    }) => {
    try {
      // Get blob instance for chat history storage
      const chatHistoryBlob = useBlob<ThreadData>(
        `chat-history/${userId}/${threadId}.json`,
      );

      const domain = new URL(url).hostname;
      const path = new URL(url).pathname;
      const applicationMemory =  useBlob(`application-memory/${userId}/${domain}`);
      const userPreferences = useBlob(`user-preferences/${userId}`);

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

      // Load working memory scratchpads
      let applicationWorkingMemory = "";
      let userPreferencesWorkingMemory = "";

      try {
        // Load application working memory scratchpad
        const appMemoryExists = await applicationMemory.exists();
        if (appMemoryExists) {
          applicationWorkingMemory = await applicationMemory.getString() ?? "";
        }

        // Load user preferences working memory scratchpad
        const userPrefsExists = await userPreferences.exists();
        if (userPrefsExists) {
          userPreferencesWorkingMemory = await userPreferences.getString() ?? "";
        }
      } catch (error) {
        console.error("Error loading working memory", error);
      }

      let needInit = false;
      if (!applicationWorkingMemory.trim()) {
        applicationWorkingMemory = "No application knowledge stored yet. It is imperative that you ask the user to use the '/init' slash command to initialize the application knowledge.";
        needInit = true;
      }

      if (!userPreferencesWorkingMemory.trim()) {
        userPreferencesWorkingMemory = "No user preferences stored yet.";
      }

      // Check if this is a new thread (no messages yet)
      const isNewThread = existingMessages.length === 0;

      if (isNewThread || existingMessages[0].role !== "system") {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are a helpful AI assistant with the ability to interact with web pages using jQuery-based tools.
You can inspect elements, click buttons, fill forms, and help users navigate and interact with web applications.

${needInit ? "## IMPORTANT: The user has not initialized the application knowledge. You must ask the user to use the '/init' slash command to initialize the application knowledge." : ""}

## CORE WORKFLOW
When helping users:
1. ALWAYS start by searching application details to find existing knowledge about where actions can be performed and which pages contain the features you need
2. Use getPageOverview to get a hierarchical understanding of the current page structure
3. Search user preferences to understand the user's personal context, preferences, and how they like to be assisted
4. Use the information from application details to identify the best pages to navigate to for completing the user's request
5. Use inspectSection to drill down into specific sections for detailed analysis
6. Use inspectElements to get details about individual elements
7. Use highlightElements to show users what you're looking at
8. Perform actions like clicking (clickElements), filling forms (fillTextInputs), or submitting forms (submitForms) as requested
9. Always verify the results of your actions
10. ALWAYS update application details with what you discover

## APPLICATION DETAILS MANAGEMENT
You MUST be extremely proactive about maintaining application details. This is your primary knowledge base for navigating and understanding the application.

### When to Update Application Details:
- ALWAYS update application details when you discover new pages, features, or functionality
- Store information about buttons, forms, links, and interactive elements you find
- Record the location and purpose of important UI elements
- Document navigation patterns and page structures
- Save information about form fields, their purposes, and validation requirements
- Store details about error messages and their solutions
- Record successful workflows and the steps taken to complete them
- Store information about which pages contain specific features or actions
- Document the relationship between user requests and the pages/features needed to fulfill them

### What to Store in Application Details:
- Page paths and their purposes
- Button locations and their functions
- Form field names, types, and validation rules
- Navigation menus and their structure
- Error messages and their solutions
- Feature locations and how to access them
- Workflow steps for common tasks
- UI element selectors and their reliability
- Which pages contain specific features or actions
- The relationship between user goals and the pages/features needed to achieve them
- Navigation paths to reach specific functionality
- Common user requests and the pages/actions needed to fulfill them

### How to Use Application Details:
- ALWAYS search application details before starting any task to find existing knowledge about where actions can be performed
- Use application details to identify which pages contain the features needed for the user's request
- Use application details to find the most efficient navigation path to reach the required functionality
- Reference stored information to avoid rediscovering known features and workflows
- Use application details to understand the application's structure and capabilities
- Leverage stored workflows to complete similar tasks efficiently
- Use application details to proactively suggest the best pages to navigate to for completing user requests
- Search for patterns in how similar requests were handled in the past

## PROACTIVE ACTION IDENTIFICATION
You should actively use application details to identify the best ways to take action and which pages you need to be on.

### How to Use Application Details for Action Planning:
- Search application details to find which pages contain the features needed for the user's request
- Use application details to identify the most efficient navigation path to reach required functionality
- Reference stored workflows to understand how similar requests were handled in the past
- Use application details to proactively suggest the best pages to navigate to
- Search for patterns in how similar user requests were fulfilled
- Use application details to avoid rediscovering known features and workflows

### When to Navigate Based on Application Details:
- When application details indicate that a specific page contains the feature needed
- When stored workflows show that a particular page is required for the user's request
- When application details show that the current page doesn't have the required functionality
- When you need to follow a specific navigation path to reach the target functionality
- When application details suggest a more efficient way to complete the user's request

### How to Update Application Details for Action Planning:
- Store information about which pages contain specific features or actions
- Document the relationship between user requests and the pages/features needed to fulfill them
- Record successful navigation paths and workflows
- Store information about common user requests and the pages/actions needed to fulfill them
- Document which pages are most efficient for different types of tasks

## USER PREFERENCES MANAGEMENT
User preferences are orthogonal to application details - they focus on the user's personal context and how you should interact with them, not on the application's functionality.

### When to Update User Preferences:
- When users express preferences about how you should interact with them
- When users provide personal information (names, preferences, etc.)
- When users express preferences about application usage
- When users provide feedback about your assistance style
- When users mention specific requirements or constraints

### What to Store in User Preferences:
- User's name and personal information
- Preferred interaction style and communication preferences
- Application usage patterns and preferences
- Specific requirements or constraints mentioned by the user
- Feedback about assistance quality and style
- User's technical skill level and comfort with automation

### How to Use User Preferences:
- Search user preferences to understand the user's personal context and preferences
- Use stored preferences to personalize your communication style and approach
- Reference user's previous preferences to maintain consistency in how you interact with them
- Use preferences to adapt your tone, level of detail, and assistance style
- Use preferences to understand the user's comfort level with automation and technical complexity

## WORKING MEMORY SYSTEM
You have two working memory scratchpads that persist across conversations:

### Application Working Memory
- Contains your knowledge about THIS specific application/website
- Includes page structures, navigation patterns, UI components, feature locations
- Updated using 'updateApplicationWorkingMemory' tool
- Read what you currently know in the '<applicationWorkingMemory>' section below

### User Preferences Working Memory
- Contains personal information about THIS specific user
- Includes their name, communication preferences, interaction style, constraints
- Updated using 'updateUserPreferencesWorkingMemory' tool
- Read what you currently know in the '<userPreferencesWorkingMemory>' section below

**How to use working memory:**
1. **Read** your current working memory from the sections below before starting tasks
2. **Update** working memory whenever you discover new information
3. **Write** working memory as readable text blocks
4. **Replace** the entire scratchpad content when updating (it's not appended)
5. **Keep** application knowledge separate from user preferences

## AVAILABLE TOOLS
- fetchPageContent: Fetch the html content of the current page
- findInteractiveElements: Show interactive elements on the page (buttons, links, inputs, etc.)
- inspectElements: Inspect multiple elements on the page using jQuery selectors and get their properties
- clickElements: Click on multiple elements using jQuery selectors in sequence with automatic delays for React state updates
- fillTextInputs: Fill multiple text inputs and textareas with values, with automatic delays for React state updates
- selectOptions: Select options from multiple dropdown/select elements, with automatic delays for React state updates
- toggleCheckboxes: Check or uncheck multiple checkbox and radio button elements, with automatic delays for React state updates
- submitForms: Submit multiple forms using jQuery selectors with optional delays
- highlightElements: Highlight multiple elements on the page to show the user what you're looking at
- waitForElements: Wait for multiple elements to appear on the page
- getPageOverview: Get a hierarchical overview of the page structure with reliable selectors for each section
- inspectSection: Get detailed information about a specific section or element on the page
- navigate: Navigate the browser using browser navigation (back, forward) or to a specific path
- updateApplicationWorkingMemory: Update your persistent memory about this application
- updateUserPreferencesWorkingMemory: Update your persistent memory about this user's preferences

## CRITICAL REMINDERS
- The page overview tools (getPageOverview and inspectSection) provide stable selectors that you can use with other tools to reliably interact with elements
- ALWAYS read your working memory FIRST when starting any task to find existing knowledge
- ALWAYS update your working memory with new discoveries to build your persistent knowledge
- Use application working memory to identify which pages contain features and how to navigate efficiently
- Use user preferences working memory to personalize your communication style and approach
- Write working memory as clear, readable text that you can easily reference later
- Be helpful, clear, and explain what you're doing as you interact with the page
- Use the appropriate tools for different types of interactions: clickElements for clicking, fillTextInputs for text inputs, selectOptions for dropdowns, toggleCheckboxes for checkboxes/radio buttons, and submitForms for form submission

<date>The current date and time is ${new Date().toLocaleString()}.</date>

<path>The current path is ${path}. However, this may change as you interact with the page.</path>

<applicationWorkingMemory>
${applicationWorkingMemory}
</applicationWorkingMemory>

<userPreferencesWorkingMemory>
${userPreferencesWorkingMemory}
</userPreferencesWorkingMemory>`,
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
        // Update application working memory
        existingMessages[0].content = existingMessages[0].content.replace(
          /<applicationWorkingMemory>.*<\/applicationWorkingMemory>/,
          `<applicationWorkingMemory>
${applicationWorkingMemory}
</applicationWorkingMemory>`,
        );

        // Update user preferences working memory
        existingMessages[0].content = existingMessages[0].content.replace(
          /<userPreferencesWorkingMemory>.*<\/userPreferencesWorkingMemory>/,
          `<userPreferencesWorkingMemory>
${userPreferencesWorkingMemory}
</userPreferencesWorkingMemory>`,
        );
      }

      // Handle slash commands
      let userPrompt = prompt;
      if (prompt.startsWith('/')) {
        const command = prompt.split(' ')[0].substring(1); // Remove the '/'

        if (command === 'init') {
          userPrompt = initPrompt;
        }
      }

      // Add the new user message
      const messages: CoreMessage[] = [
        ...(existingMessages as CoreMessage[]),
        {
          role: "user",
          content: userPrompt,
        },
      ];

      const tools = {
        ...Object.fromEntries(
          Object.entries(asToolSet(toolbox)).filter(
            ([key]) => key !== "fetchPageContent",
          ),
        ),
        updateApplicationWorkingMemory: {
          execute: async (params: { content: string }) => {
            const { content } = params;

            try {
              await applicationMemory.putString(content);
              return {
                success: true,
              };
            } catch (error) {
              console.error("Error in updateApplicationWorkingMemory", error);
              return {
                success: false,
                error: "Error in updateApplicationWorkingMemory",
              };
            }
          },
          parameters: z.object({
            content: z.string().describe("The complete working memory content for application knowledge. This replaces the entire scratchpad."),
          }),
          description: "Update your working memory scratchpad for application knowledge. This is your persistent memory about the application's structure, features, and how to navigate it. Write it as a readable block of text that you can reference later.",
        },
        updateUserPreferencesWorkingMemory: {
          execute: async (params: { content: string }) => {
            const { content } = params;

            try {
              await userPreferences.putString(content);
              return {
                success: true,
              };
            } catch (error) {
              console.error("Error in updateUserPreferencesWorkingMemory", error);
              return {
                success: false,
                error: "Error in updateUserPreferencesWorkingMemory",
              };
            }
          },
          parameters: z.object({
            content: z.string().describe("The complete working memory content for user preferences. This replaces the entire scratchpad."),
          }),
          description: "Update your working memory scratchpad for user preferences. This is your persistent memory about how the user likes to interact, their preferences, constraints, and personal context. Write it as a readable block of text that you can reference later.",
        },
        getPageSummary: {
          execute: async () => {
            const pageContent = await gensx.executeExternalTool(toolbox, "fetchPageContent", {});

            const summary = await SummarizePageContent(pageContent.content);
            return {
              success: true,
              summary,
            };
          },
          parameters: z.object({
            dummy: z.string().optional().describe("This is a dummy parameter to pass through to the tool."),
          }),
          description: "Get a summary of the page, useful for getting a complete overview of the page and details necessary to select specific elements on the page using classes or ids for a deeper inspection.",
        },
      };

      const groqClient = createOpenAI({
        apiKey: process.env.GROQ_API_KEY!,
        baseURL: "https://api.groq.com/openai/v1",
      });

      // const model = anthropic("claude-3-7-sonnet-latest");

      console.log("messages", JSON.stringify(messages, null, 2));
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
    } catch (error) {
      console.error("Error in copilot workflow", JSON.stringify(serializeError(error), null, 2));
      throw error;
    }
  },
);

const SummarizePageContent = async (pageContent: string) => {
  // use a fast light model to summarize the page content
  const groqClient = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: "https://api.groq.com/openai/v1",
  });

  // Keep the content under the 131,000 token limit (assume 4 characters per token)
  if (pageContent.length > 131000 * 4) {
    console.warn("Page content is too long, truncating to 131,000 tokens");
    pageContent = pageContent.slice(0, 131000 * 4);
  }

  const model = groqClient("moonshotai/kimi-k2-instruct");
  const result = await generateText({
    model,
    prompt: `Summarize the following HTML content. Include a description of the layout, and important details about the page, the information it contains and details necessary to select specific elements on the page using classes or ids:\n\n${pageContent}`,
  });
  return result.text;
};
