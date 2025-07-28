import * as gensx from "@gensx/core";
import { useBlob, useSearch } from "@gensx/storage";
import { CoreMessage } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { serializeError } from "serialize-error";

import { Agent } from "./agent";
import { asToolSet, generateText } from "@gensx/vercel-ai";
import { toolbox } from "./tools/toolbox";
import { z } from "zod";

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
    threadId?: string;
    userId?: string;
    url: string;
    }) => {
    try {
      threadId = threadId ?? "default";
      userId = userId ?? "default";

      // Get blob instance for chat history storage
      const chatHistoryBlob = useBlob<ThreadData>(
        `chat-history/${userId}/${threadId}.json`,
      );

      const domain = new URL(url).hostname;
      const path = new URL(url).pathname;
      const applicationMemory = await useSearch(`application-memory/${userId}/${domain}`);
      const userPreferences = await useSearch(`user-preferences/${userId}`);

      let importantApplicationDetails: { content: string; path: string }[] = [];

      try {
        const importantApplicationDetailsQuery = await applicationMemory.query({
          filters: ['important', 'Eq', true],
          includeAttributes: ["content", "path"],
        });

        if (importantApplicationDetailsQuery.rows) {
          importantApplicationDetails = importantApplicationDetailsQuery.rows.map((row) => ({
            content: row.content as string,
            path: row.path as string,
          }));
        }
      } catch (error) {
        console.error("Error in importantApplicationDetails", error);
      }

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

      if (isNewThread || existingMessages[0].role !== "system") {
        const systemMessage: CoreMessage = {
          role: "system",
          content: `You are a helpful AI assistant with the ability to interact with web pages using jQuery-based tools.
You can inspect elements, click buttons, fill forms, and help users navigate and interact with web applications.

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
- searchUserPreferences: Searches the stored user preferences for information
- updateUserPreferences: Writes information to the user preferences
- searchApplicationDetails: Searches the application details for information about the given path and query
- updateApplicationDetails: Writes information to the application details

## CRITICAL REMINDERS
- The page overview tools (getPageOverview and inspectSection) provide stable selectors that you can use with other tools to reliably interact with elements
- ALWAYS search application details FIRST when starting any task to find existing knowledge about where actions can be performed
- ALWAYS update application details with every new discovery to build your knowledge base
- Use application details to identify which pages contain the features needed for user requests
- Use application details to find the most efficient navigation path to reach required functionality
- Proactively suggest the best pages to navigate to based on application details
- Use user preferences to personalize your communication style and approach (orthogonal to application functionality)
- Be helpful, clear, and explain what you're doing as you interact with the page
- Use the appropriate tools for different types of interactions: clickElements for clicking, fillTextInputs for text inputs, selectOptions for dropdowns, toggleCheckboxes for checkboxes/radio buttons, and submitForms for form submission

<date>The current date and time is ${new Date().toLocaleString()}.</date>

<path>The current path is ${path}. However, this may change as you interact with the page.</path>

<importantApplicationDetails>
${importantApplicationDetails.map((detail) => `<detail>${detail.content}</detail>`).join("\n")}
</importantApplicationDetails>`,
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
        existingMessages[0].content = existingMessages[0].content.replace(
          /<importantApplicationDetails>.*<\/importantApplicationDetails>/,
          `<importantApplicationDetails>${importantApplicationDetails.map((detail) => `<detail>${detail.content}</detail>`).join("\n")}</importantApplicationDetails>`,
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

      const tools = {
        ...Object.fromEntries(
          Object.entries(asToolSet(toolbox)).filter(
            ([key]) => key !== "fetchPageContent",
          ),
        ),
        searchUserPreferences: {
          execute: async (params: { preference?: string; query: string; }) => {
            const { preference, query } = params;

            try {
              const result = await userPreferences.query({
                filters: preference ? ['Or', [['preference', 'Eq', preference], ['preference', 'Glob', preference], ['preference', 'Contains', preference]]] : undefined,
                rankBy: ['content', 'BM25', query],
                topK: 10,
                includeAttributes: ["content", "preference"],
              });

              return {
                success: true,
                results: result,
              };
            } catch (error) {
              console.error("Error in searchUserPreferences", error);
              return {
                success: false,
                error: "Error in searchUserPreferences",
              };
            }
          },
          parameters: z.object({
            preference: z.string().optional().describe("The preference you are looking for. This is a partial name or glob pattern."),
            query: z.string().describe("The information you are looking for."),
          }),
          description: "Search the stored user preferences for information.",
        },
        updateUserPreferences: {
          execute: async (params: { preference: string; value: string; }) => {
            const { preference, value } = params;

            try {
              await userPreferences.write({
                upsertRows: [{
                  id: `${preference}-${Date.now()}`,
                  preference: preference,
                  content: value,
                }],
                schema: {
                  preference: { type: "string", filterable: true },
                  content: { type: "string", fullTextSearch: true },
                }
              });
            } catch (error) {
              console.error("Error in updateUserPreferences", error);
              return {
                success: false,
                error: "Error in updateUserPreferences",
              };
            }
            return {
              success: true,
            };
          },
          parameters: z.object({
            preference: z.string().describe("A name for the user's preference. This is used later when looking up preferences."),
            value: z.string().describe("The information you would like to store in the user preferences"),
          }),
          description: "Add information to the user preferences. Use this to store important information about the user's preferences, such as their name, or how they would like you to interact with them and take actions.",
        },
        searchApplicationDetails: {
          execute: async (params: { query: string; path?: string; }) => {
            const { query, path } = params

            try {
              const result = await applicationMemory.query({
                filters: path ? ['Or', [['path', 'Eq', path], ['path', 'Glob', path]]] : undefined,
                rankBy: ['content', 'BM25', query],
                topK: 10,
                includeAttributes: ["content", "path"],
              });

              return {
                success: true,
                results: result,
              };
            } catch (error) {
              console.error("Error in searchApplicationDetails", error);
              return {
                success: false,
                error: "Error in searchApplicationDetails",
              };
            }
          },
          parameters: z.object({
            query: z.string().describe("The information you are looking for"),
            path: z.string().optional().describe("The path of the page you are looking for. Can be a glob pattern."),
          }),
          description: "Search the application details for information about the given path and query. This should be used to find information, abilities, or details that were previously discovered.",
        },
        updateApplicationDetails: {
          execute: async (params: { path: string; keyInformation: string; important?: boolean }) => {
            const { path, keyInformation, important } = params;

            try {
              await applicationMemory.write({
                  upsertRows: [{
                  id: `${path}-${Date.now()}`,
                  path: path,
                    content: keyInformation,
                    important: important,
                }],
                schema: {
                  path: { type: "string", filterable: true },
                  content: { type: "string", fullTextSearch: true },
                  important: { type: "bool" },
                }
              });
            } catch (error) {
              console.error("Error in updateApplicationDetails", error);
              return {
                success: false,
                error: "Error in updateApplicationDetails",
              };
            }
            return {
              success: true,
            };
          },
          parameters: z.object({
            path: z.string().describe("The path of the page you are looking at. This attaches the information to the specific path."),
            keyInformation: z.string().describe("The information you would like to store in the application memory"),
            important: z.boolean().optional().describe("Whether the information is important. Important information will be provided to you for any future tasks proactively, so use it only for details that are generally relevant, such as application structure, location of key features, or other details that are generally useful to know."),
          }),
          description: "Use this to store information about a specific path, actions that are available on that page, or details that may be relevant for future tasks.",
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

      // const groqClient = createOpenAI({
      //   apiKey: process.env.GROQ_API_KEY!,
      //   baseURL: "https://api.groq.com/openai/v1",
      // });

      console.log('messages', messages);

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
