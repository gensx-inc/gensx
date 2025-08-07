// Genie Chrome Extension Background Script

import {
  ExtensionMessage,
  TabInfo,
  WorkflowMessage,
  SettingsManager,
  TodoList,
} from "./types/copilot";
import { GenSX } from "@gensx/client";
import { applyObjectPatches } from "./utils/workflow-state";
import { type CoreMessage } from "ai";

// Legacy: currentWorkflowTabId removed - now using explicit tab selection

// Track tabs opened by the extension (for security)
const extensionOpenedTabs = new Set<number>();

// Clean up closed tabs from tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  const wasTracked = extensionOpenedTabs.delete(tabId);
  if (wasTracked) {
    console.log(
      "Extension-opened tab closed:",
      tabId,
      `(${extensionOpenedTabs.size} tracked tabs remaining)`,
    );
  }
});

// Offscreen document management for geolocation
const OFFSCREEN_DOCUMENT_PATH = "/offscreen.html";
let creating: Promise<void> | null = null; // A global promise to avoid concurrency issues

chrome.runtime.onInstalled.addListener(async () => {
  console.log("✅ Genie extension installed");

  // Initialize or retrieve consistent userId on installation
  await initializeUserId();

  const settings = await SettingsManager.get();
  // If we are not in local mode, fetch scoped token from the genie API if there is not one in storage
  if (!settings.apiEndpoint.includes("localhost") && !chrome.storage.local.get("scopedToken")) {
    // Fetch scoped token from the genie API. (genie.gensx.com/api/v1/scoped-tokens)
    const response = await fetch(
      `https://genie.gensx.com/api/v1/scoped-tokens`,
      {
        method: "POST",
        body: JSON.stringify({
          userId: await getUserId(),
        }),
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch scoped token:", response.statusText);
      return;
    }

    const tokenResponse = await response.json();

    // Store the token in storage
    await chrome.storage.local.set({ scopedToken: tokenResponse });

    console.log("✅ Scoped token stored in storage");
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeUserId();

  const settings = await SettingsManager.get();
  // If we are not in local mode, fetch scoped token from the genie API if there is not one in storage
  if (!settings.apiEndpoint.includes("localhost") && !chrome.storage.local.get("scopedToken")) {
    // Fetch scoped token from the genie API. (genie.gensx.com/api/v1/scoped-tokens)
    const response = await fetch(
      `https://genie.gensx.com/api/scoped-tokens`,
      {
        method: "POST",
        body: JSON.stringify({
          userId: await getUserId(),
        }),
      },
    );

    if (!response.ok) {
      console.error("Failed to fetch scoped token:", response.statusText);
      return;
    }

    const tokenResponse = await response.json();

    // Store the token in storage
    await chrome.storage.local.set({ scopedToken: tokenResponse });

    console.log("✅ Scoped token stored in storage");
  }
});

// Generate and store a consistent userId for the extension
async function initializeUserId(): Promise<string> {
  try {
    // Try to get existing userId
    const stored = await chrome.storage.local.get(["userId"]);

    if (stored.userId) {
      console.log("Using existing userId:", stored.userId);
      return stored.userId;
    }

    // Generate new userId if none exists
    const newUserId =
      "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Store the new userId
    await chrome.storage.local.set({ userId: newUserId });
    console.log("Generated and stored new userId:", newUserId);

    return newUserId;
  } catch (error) {
    console.error("Failed to initialize userId:", error);
    // Fallback to generating a temporary one
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// Get userId from storage (creates one if it doesn't exist)
async function getUserId(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(["userId"]);

    if (stored.userId) {
      return stored.userId;
    }

    // If no userId exists, create one
    return await initializeUserId();
  } catch (error) {
    console.error("Failed to get userId:", error);
    // Fallback to generating a temporary one
    return "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }
}

// Generate and get threadId - creates new one or gets current active one
async function getThreadId(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(["currentThreadId"]);

    if (stored.currentThreadId) {
      console.log("Using existing threadId:", stored.currentThreadId);
      return stored.currentThreadId;
    }

    // Generate new threadId if none exists
    const newThreadId =
      "thread_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Store the new threadId
    await chrome.storage.local.set({ currentThreadId: newThreadId });
    console.log("Generated and stored new threadId:", newThreadId);

    return newThreadId;
  } catch (error) {
    console.error("Failed to get threadId:", error);
    // Fallback to generating a temporary one
    return (
      "thread_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }
}

// Create a new threadId (for starting new conversations)
async function createNewThreadId(): Promise<string> {
  try {
    const newThreadId =
      "thread_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

    // Store the new threadId
    await chrome.storage.local.set({ currentThreadId: newThreadId });
    console.log("Created new threadId:", newThreadId);

    return newThreadId;
  } catch (error) {
    console.error("Failed to create new threadId:", error);
    // Fallback to generating a temporary one
    return (
      "thread_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
    );
  }
}

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    console.log("📋 Opening side panel for tab:", tab.id);
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});


const getClient = async () => {
  const settings = await SettingsManager.get();
  return new GenSX({
    apiKey: (await chrome.storage.local.get("scopedToken"))?.scopedToken?.token as string,
    baseUrl: settings.apiEndpoint,
  });
};

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("Background received message:", message);

    if (message.type === "CONTENT_SCRIPT_READY") {
      console.log(
        "✅ Content script ready on tab:",
        sender.tab?.id,
        message.url,
      );
      return false; // Not handling this message async
    }

    if (message.type === "GET_TAB_INFO") {
      // Get current tab information
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].id && tabs[0].url && tabs[0].title) {
          const domain = tabs[0].url ? new URL(tabs[0].url).hostname : "";
          const tabInfo: TabInfo = {
            url: tabs[0].url,
            title: tabs[0].title,
            domain,
            id: tabs[0].id,
          };
          sendResponse(tabInfo);
        }
      });
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "WORKFLOW_REQUEST") {
      handleWorkflowRequest(message as WorkflowMessage, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "WORKFLOW_RECONNECT") {
      handleWorkflowReconnect(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "GET_THREAD_HISTORY") {
      handleGetThreadHistory(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "GET_GEOLOCATION") {
      handleGeolocationRequest(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "GET_USER_ID") {
      getUserId()
        .then((userId) => {
          sendResponse({ success: true, userId });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Failed to get userId",
          });
        });
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "GET_THREAD_ID") {
      getThreadId()
        .then((threadId) => {
          sendResponse({ success: true, threadId });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error:
              error instanceof Error ? error.message : "Failed to get threadId",
          });
        });
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "NEW_THREAD_ID") {
      createNewThreadId()
        .then((threadId) => {
          sendResponse({ success: true, threadId });
        })
        .catch((error) => {
          sendResponse({
            success: false,
            error:
              error instanceof Error
                ? error.message
                : "Failed to create new threadId",
          });
        });
      return true; // Indicates we will send a response asynchronously
    }

    return false; // Not handling this message
  },
);

// Handle workflow execution with streaming support
async function handleWorkflowRequest(
  message: WorkflowMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { requestId, data } = message;

  try {
    console.log("Executing workflow for request:", requestId);

    // Create GenSX client
    const gensx = await getClient();

    // Execute the copilot workflow
    const response = await gensx.runRaw("copilot", {
      inputs: {
        prompt: data.prompt,
        threadId: data.threadId,
        userId: data.userId,
        userName: data.userName,
        userContext: data.userContext,
        selectedTabs: data.selectedTabs || [],
        conversationMode: data.conversationMode || "general",
      },
    });

    console.log(
      "Starting to process streaming response for request:",
      requestId,
    );

    // Process the streaming response
    await processStreamingResponse(response, requestId, sender);
  } catch (error) {
    console.error("Workflow execution failed for request:", requestId, error);

    // Send error response to popup
    chrome.runtime
      .sendMessage({
        type: "WORKFLOW_ERROR",
        requestId,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      })
      .catch(() => {
        // Ignore errors if popup is not open
      });
  }
}

// Handle thread history retrieval
async function handleGetThreadHistory(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { data } = message;
  const { userId, threadId } = data;

  try {
    console.log("Getting thread history for:", userId, threadId);

    const gensx = await getClient();

    console.log("Running fetchChatHistory workflow...");
    const { output: threadData } = await gensx.run<{
      messages: CoreMessage[];
      todoList: { items: { title: string; completed: boolean }[] };
    }>("fetchChatHistory", {
      inputs: { userId, threadId },
    });

    console.log("fetchChatHistory workflow output:", threadData);

    let messages: CoreMessage[] = [];
    if (threadData?.messages && Array.isArray(threadData.messages)) {
      messages = threadData.messages;
    }

    // Extract todoList, defaulting to empty list if not present
    let todoList: TodoList = { items: [] };
    if (
      threadData?.todoList &&
      threadData.todoList.items &&
      Array.isArray(threadData.todoList.items)
    ) {
      todoList = threadData.todoList;
    }

    console.log(
      "Retrieved thread history:",
      messages.length,
      "messages",
      todoList.items.length,
      "todo items",
    );

    // Convert GenSX messages to popup-compatible format
    const convertedMessages = messages
      .filter((msg: any) => msg.role !== "system") // Filter out system messages for UI
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        toolCalls: msg.toolCalls,
      }));

    console.log(
      "Converted messages for popup:",
      convertedMessages.length,
      "messages",
    );

    sendResponse({
      success: true,
      messages: convertedMessages,
      todoList: todoList,
    });
  } catch (error) {
    console.error("Failed to get thread history:", error);
    sendResponse({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to retrieve thread history",
      messages: [],
      todoList: { items: [] },
    });
  }
}

// Handle workflow reconnection
async function handleWorkflowReconnect(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { requestId, data } = message;
  const { executionId } = data;

  try {
    console.log("Reconnecting to workflow execution:", executionId);

    const gensx = await getClient();

    // Use GenSX getProgress API to reconnect to the execution
    const stream = await gensx.getProgress({ executionId });

    console.log(
      "Reconnection successful, processing progress stream:",
      executionId,
    );

    // Create a Response-like object with the stream for compatibility
    const response = new Response(stream, {
      headers: { "content-type": "application/x-ndjson" },
    });

    // Process the streaming response from the reconnection
    await processStreamingResponse(response, requestId, sender);
  } catch (error) {
    console.error(
      "Workflow reconnection failed for execution:",
      executionId,
      error,
    );

    // Send error response to popup
    chrome.runtime
      .sendMessage({
        type: "WORKFLOW_ERROR",
        requestId,
        error: error instanceof Error ? error.message : "Reconnection failed",
      })
      .catch(() => {
        // Ignore errors if popup is not open
      });
  }
}

// Process streaming JSON lines from GenSX workflow
async function processStreamingResponse(
  response: Response,
  requestId: string,
  sender: chrome.runtime.MessageSender,
) {
  if (!response.body) {
    throw new Error("No response body available for streaming");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let isComplete = false;

  let executionId: string | undefined;
  let messagesState: any = {}; // Track the full messages object state
  let todoListState: TodoList = { items: [] }; // Track the todo list state

  try {
    while (!isComplete) {
      const { value, done } = await reader.read();

      if (done) {
        isComplete = true;
        break;
      }

      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete JSON lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep the incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            console.log("Processing streaming event:", event, executionId);

            if (event.type === "start") {
              executionId = event.workflowExecutionId;

              // Send execution ID to popup for state tracking
              chrome.runtime
                .sendMessage({
                  type: "WORKFLOW_EXECUTION_STARTED",
                  requestId,
                  data: {
                    executionId,
                  },
                })
                .catch(() => {
                  // Ignore errors if popup is not open
                });
            }

            // Update messages state if this is a messages object update
            if (event.type === "object" && event.label === "messages") {
              messagesState = applyObjectPatches(event.patches, messagesState);
              console.log("Updated messages state:", messagesState);
            }

            // Update todo list state if this is a todoList object update
            if (event.type === "object" && event.label === "todoList") {
              todoListState = applyObjectPatches(
                event.patches,
                todoListState,
              ) as TodoList;
              console.log("Updated todo list state:", todoListState);
            }

            await processStreamingEvent(
              executionId,
              event,
              requestId,
              sender,
              messagesState,
              todoListState,
            );
          } catch (parseError) {
            console.warn("Failed to parse streaming event:", line, parseError);
          }
        }
      }
    }

    // Send final completion message to popup
    chrome.runtime
      .sendMessage({
        type: "WORKFLOW_STREAM_COMPLETE",
        requestId,
        data: {
          finalMessage: "",
        },
      })
      .catch(() => {
        // Ignore errors if popup is not open
      });

    console.log("Streaming completed for request:", requestId);
  } catch (streamError) {
    console.error("Error processing stream:", streamError);

    // Send error to popup
    chrome.runtime
      .sendMessage({
        type: "WORKFLOW_ERROR",
        requestId,
        error:
          streamError instanceof Error
            ? streamError.message
            : "Streaming error occurred",
      })
      .catch(() => {
        // Ignore errors if popup is not open
      });
  } finally {
    reader.releaseLock();
  }
}

// Process individual streaming events
async function processStreamingEvent(
  executionId: string | undefined,
  event: any,
  requestId: string,
  sender: chrome.runtime.MessageSender,
  messagesState: any,
  todoListState: TodoList,
) {
  // Handle external tool calls
  if (event.type === "external-tool") {
    if (!executionId) {
      console.error("Execution ID is not set");
      return;
    }

    console.log("External tool call detected:", event);

    // Handle special background-only tools
    if (event.toolName === "openTab") {
      await handleOpenTabTool(executionId, event);
      return;
    }

    if (event.toolName === "closeTab") {
      await handleCloseTabTool(executionId, event);
      return;
    }

    if (event.toolName === "navigate") {
      await handleNavigateTool(executionId, event);
      return;
    }

    // Get tab ID from tool parameters (most tools require tabId)
    const toolTabId = event.params?.tabId;
    if (!toolTabId) {
      // Return proper error result instead of throwing, so the model can retry
      const errorResult = {
        success: false,
        error: `Tool '${event.toolName}' requires a tabId parameter, but none was provided. Please include the tab ID of the browser tab you want to interact with.`,
        message: `Missing required tabId parameter for ${event.toolName} tool`,
      };

      const gensx = await getClient();
      await gensx.resume({
        executionId,
        nodeId: event.nodeId,
        data: errorResult,
      });
      return;
    }

    try {
      // Verify the specified tab exists
      let tab;
      try {
        tab = await chrome.tabs.get(toolTabId);
        console.log(
          "Using specified tab for tool execution:",
          toolTabId,
          tab.url,
        );
      } catch (tabError) {
        console.warn("Tab no longer exists:", toolTabId, tabError);

        // Resume workflow with error indicating tab was closed
        const gensx = await getClient();
        await gensx.resume({
          executionId,
          nodeId: event.nodeId,
          data: {
            success: false,
            error: `Tab ${toolTabId} is no longer available (may have been closed)`,
          },
        });
        return;
      }

      // Try to send message to content script, with fallback to inject if needed
      let toolResponse;
      try {
        toolResponse = await chrome.tabs.sendMessage(toolTabId, {
          type: "EXTERNAL_TOOL_CALL",
          requestId,
          data: {
            toolName: event.toolName,
            params: event.params,
            nodeId: event.nodeId,
            paramsSchema: event.paramsSchema,
            resultSchema: event.resultSchema,
          },
        });
      } catch (connectionError) {
        console.warn(
          "Content script connection failed, attempting to inject:",
          connectionError,
        );

        // Try to inject the content script manually
        try {
          await chrome.scripting.executeScript({
            target: { tabId: toolTabId },
            files: ["content.js"],
          });

          // Wait a bit for the script to initialize
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Retry the message
          toolResponse = await chrome.tabs.sendMessage(toolTabId, {
            type: "EXTERNAL_TOOL_CALL",
            requestId,
            data: {
              toolName: event.toolName,
              params: event.params,
              nodeId: event.nodeId,
              paramsSchema: event.paramsSchema,
              resultSchema: event.resultSchema,
            },
          });
        } catch (injectionError) {
          console.error("Failed to inject content script:", injectionError);
          throw new Error(
            `Content script injection failed: ${injectionError instanceof Error ? injectionError.message : String(injectionError)}`,
          );
        }
      }

      console.log("Tool execution response:", toolResponse);

      const gensx = await getClient();

      await gensx.resume({
        executionId,
        nodeId: event.nodeId,
        data: toolResponse.data.result,
      });
    } catch (error) {
      console.error("Tool execution failed:", error);

      // Resume workflow with error information
      try {
        const gensx = await getClient();
        await gensx.resume({
          executionId,
          nodeId: event.nodeId,
          data: {
            success: false,
            error:
              error instanceof Error ? error.message : "Tool execution failed",
          },
        });
      } catch (resumeError) {
        console.error("Failed to resume workflow with error:", resumeError);
      }
    }
    return;
  }

  // Send structured messages for UI updates to popup
  if (event.type === "object" && event.label === "messages") {
    // Send the full structured messages to popup (all extension contexts)
    const messageData = {
      type: "WORKFLOW_MESSAGES_UPDATE",
      requestId,
      data: {
        messages: messagesState.messages || [],
        isIncremental: event.patches?.some(
          (p: any) => p.op === "string-append",
        ),
      },
    };

    // Send to popup and other extension contexts
    chrome.runtime.sendMessage(messageData).catch(() => {
      // Ignore errors if popup is not open
    });
  }

  // Send todo list updates to popup
  if (event.type === "object" && event.label === "todoList") {
    const todoListData = {
      type: "WORKFLOW_TODO_LIST_UPDATE",
      requestId,
      data: {
        todoList: todoListState,
      },
    };

    // Send to popup and other extension contexts
    chrome.runtime.sendMessage(todoListData).catch(() => {
      // Ignore errors if popup is not open
    });
  }

  // Handle workflow errors (only if execution actually failed)
  if (event.type === "error") {
    console.error("Workflow error received:", event);

    // Only treat as execution failure if executionStatus is explicitly "failed"
    // Stream errors can occur during execution without indicating complete failure
    if (event.executionStatus === "failed") {
      console.error("Execution failed, notifying popup");

      // Send error to popup
      chrome.runtime
        .sendMessage({
          type: "WORKFLOW_ERROR",
          requestId,
          error: event.error || event.message || "Workflow execution failed",
        })
        .catch(() => {
          // Ignore errors if popup is not open
        });
    } else {
      console.warn(
        "Stream error occurred but execution not failed, continuing...",
        {
          error: event.error || event.message,
          executionStatus: event.executionStatus,
        },
      );
    }
    return;
  }
}

// Browser action now opens popup by default (configured in manifest.json)

// Content script is automatically injected via manifest.json content_scripts
// No need for manual injection since we have matches: ["<all_urls>"]

// Handle openTab tool execution
async function handleOpenTabTool(
  executionId: string,
  event: any,
): Promise<void> {
  try {
    console.log("Executing openTab tool:", event.params);

    const { url, active = true } = event.params;

    // Validate URL
    try {
      new URL(url);
    } catch (urlError) {
      throw new Error(`Invalid URL provided: ${url}`);
    }

    // Create the new tab
    const newTab = await chrome.tabs.create({
      url: url,
      active: active,
    });

    if (!newTab.id) {
      throw new Error("Failed to create new tab - no tab ID returned");
    }

    console.log("Successfully created new tab:", newTab.id, newTab.url);

    // Track this tab as opened by the extension
    extensionOpenedTabs.add(newTab.id);
    console.log(
      "Added tab to extension tracking:",
      newTab.id,
      `(${extensionOpenedTabs.size} tracked tabs)`,
    );

    // Wait for the tab to start loading to get better title/domain info
    // Try multiple times with increasing delays to get good tab info
    let updatedTab = newTab;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      await new Promise((resolve) =>
        setTimeout(resolve, attempts === 0 ? 300 : 800),
      );

      try {
        updatedTab = await chrome.tabs.get(newTab.id);
        // If we got a meaningful title, break early
        if (
          updatedTab.title &&
          updatedTab.title !== "New Tab" &&
          !updatedTab.title.startsWith("chrome://")
        ) {
          console.log(
            `Got good tab info on attempt ${attempts + 1}:`,
            updatedTab.title,
          );
          break;
        }
      } catch (tabError) {
        console.warn("Error getting updated tab info:", tabError);
        break;
      }
      attempts++;
    }

    const domain = updatedTab.url ? new URL(updatedTab.url).hostname : "";

    const result = {
      success: true,
      tabId: updatedTab.id,
      url: updatedTab.url || url,
      title: updatedTab.title || domain || "New Tab",
      domain: domain,
      message: `Successfully opened new tab: ${updatedTab.title || domain || url}`,
    };

    console.log("openTab tool result:", result);

    // Always notify popup to add this tab to selected tabs, even with basic info
    const tabData = {
      tabId: updatedTab.id,
      url: updatedTab.url || url,
      title: updatedTab.title || domain || "New Tab",
      domain: domain,
      favicon: updatedTab.favIconUrl,
      isActive: active,
    };

    console.log("Sending TAB_OPENED_ADD_TO_SELECTED notification:", tabData);

    try {
      await chrome.runtime.sendMessage({
        type: "TAB_OPENED_ADD_TO_SELECTED",
        data: tabData,
      });
      console.log("Successfully notified popup about new tab");
    } catch (notificationError) {
      // This might happen if popup is closed, but that's okay
      console.log(
        "Popup not open, but tab will be available in @ mentions:",
        notificationError,
      );
    }

    // Resume workflow with success result
    const gensx = await getClient();
    await gensx.resume({
      executionId,
      nodeId: event.nodeId,
      data: result,
    });
  } catch (error) {
    console.error("openTab tool execution failed:", error);

    // Resume workflow with error information
    const gensx = await getClient();
    await gensx.resume({
      executionId,
      nodeId: event.nodeId,
      data: {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to open new tab",
      },
    });
  }
}

// Handle closeTab tool execution
async function handleCloseTabTool(
  executionId: string,
  event: any,
): Promise<void> {
  try {
    console.log("Executing closeTab tool:", event.params);

    const { tabIds } = event.params;

    // Validate tabIds
    if (!Array.isArray(tabIds) || tabIds.length === 0) {
      throw new Error(
        "Invalid tabIds provided - must be a non-empty array of numbers",
      );
    }

    // Validate each tabId
    for (const tabId of tabIds) {
      if (!tabId || typeof tabId !== "number") {
        throw new Error(`Invalid tabId provided: ${tabId} - must be a number`);
      }
    }

    console.log(`Processing ${tabIds.length} tab(s) for closure:`, tabIds);

    const closedTabs: number[] = [];
    const failedTabs: Array<{ tabId: number; error: string }> = [];

    // Process each tab
    for (const tabId of tabIds) {
      try {
        // Security check: Only allow closing tabs opened by the extension
        if (!extensionOpenedTabs.has(tabId)) {
          failedTabs.push({
            tabId,
            error: `Tab was not opened by this extension. For security, only extension-created tabs can be closed.`,
          });
          continue;
        }

        // Verify the tab still exists
        let tab;
        try {
          tab = await chrome.tabs.get(tabId);
          console.log("Closing tab:", tabId, tab.url);
        } catch (tabError) {
          console.warn("Tab no longer exists:", tabId, tabError);

          // Remove from tracking and count as success (tab is effectively closed)
          extensionOpenedTabs.delete(tabId);
          closedTabs.push(tabId);
          continue;
        }

        // Close the tab
        await chrome.tabs.remove(tabId);

        // Remove from tracking (the onRemoved listener will also handle this)
        extensionOpenedTabs.delete(tabId);
        closedTabs.push(tabId);

        console.log(`Successfully closed tab ${tabId}:`, tab.title || tab.url);
      } catch (tabError) {
        console.error(`Failed to close tab ${tabId}:`, tabError);
        failedTabs.push({
          tabId,
          error:
            tabError instanceof Error
              ? tabError.message
              : "Unknown error occurred",
        });
      }
    }

    // Prepare result
    const allSuccessful = failedTabs.length === 0;
    const result = {
      success: allSuccessful,
      closedTabs: closedTabs.length > 0 ? closedTabs : undefined,
      failedTabs: failedTabs.length > 0 ? failedTabs : undefined,
      message: allSuccessful
        ? `Successfully closed ${closedTabs.length} tab(s)`
        : `Closed ${closedTabs.length} tab(s), failed to close ${failedTabs.length} tab(s)`,
      error: allSuccessful
        ? undefined
        : `Some tabs failed to close. Check failedTabs for details.`,
    };

    console.log("closeTab tool result:", result);

    // Resume workflow with result
    const gensx = await getClient();
    await gensx.resume({
      executionId,
      nodeId: event.nodeId,
      data: result,
    });
  } catch (error) {
    console.error("closeTab tool execution failed:", error);

    // Resume workflow with error information
    const gensx = await getClient();
    await gensx.resume({
      executionId,
      nodeId: event.nodeId,
      data: {
        success: false,
        error: error instanceof Error ? error.message : "Failed to close tabs",
      },
    });
  }
}

// Handle navigate tool execution
async function handleNavigateTool(
  executionId: string,
  event: any,
): Promise<void> {
  try {
    console.log("Executing navigate tool:", event.params);

    const {
      tabId,
      action,
      path,
      url,
      waitForLoad = true,
      timeout = 5000,
    } = event.params;

    // Validate required parameters
    if (!tabId || typeof tabId !== "number") {
      throw new Error("Invalid tabId provided - must be a number");
    }

    if (!action) {
      throw new Error("Navigation action is required");
    }

    // Verify the tab exists
    let tab;
    try {
      tab = await chrome.tabs.get(tabId);
      console.log("Navigating tab:", tabId, tab.url);
    } catch (tabError) {
      console.warn("Tab no longer exists:", tabId, tabError);

      const result = {
        success: false,
        error: `Tab ${tabId} is no longer available (may have been closed)`,
      };

      const gensx = await getClient();
      await gensx.resume({
        executionId,
        nodeId: event.nodeId,
        data: result,
      });
      return;
    }

    const previousUrl = tab.url || "";
    const startTime = Date.now();

    // Handle navigation based on action type
    if (action === "back") {
      // Use content script for back/forward navigation (doesn't reload page)
      try {
        const toolResponse = await chrome.tabs.sendMessage(tabId, {
          type: "EXTERNAL_TOOL_CALL",
          data: {
            toolName: "navigate",
            params: event.params,
          },
        });

        const result = {
          success: true,
          action,
          currentUrl: toolResponse.data?.currentUrl || previousUrl,
          previousUrl,
          loadTime: Date.now() - startTime,
          message: `Successfully executed ${action} navigation`,
        };

        const gensx = await getClient();
        await gensx.resume({
          executionId,
          nodeId: event.nodeId,
          data: result,
        });
      } catch (error) {
        console.error("Back navigation failed:", error);
        throw error;
      }
    } else if (action === "forward") {
      // Use content script for back/forward navigation (doesn't reload page)
      try {
        const toolResponse = await chrome.tabs.sendMessage(tabId, {
          type: "EXTERNAL_TOOL_CALL",
          data: {
            toolName: "navigate",
            params: event.params,
          },
        });

        const result = {
          success: true,
          action,
          currentUrl: toolResponse.data?.currentUrl || previousUrl,
          previousUrl,
          loadTime: Date.now() - startTime,
          message: `Successfully executed ${action} navigation`,
        };

        const gensx = await getClient();
        await gensx.resume({
          executionId,
          nodeId: event.nodeId,
          data: result,
        });
      } catch (error) {
        console.error("Forward navigation failed:", error);
        throw error;
      }
    } else if (action === "path" || action === "url") {
      // Handle path/url navigation directly in background script (causes page reload)
      let targetUrl;

      if (action === "path") {
        if (!path) {
          throw new Error("Path is required for path navigation");
        }

        // Construct URL from current origin + path
        const currentOrigin = new URL(previousUrl).origin;
        targetUrl = currentOrigin + path;
      } else {
        if (!url) {
          throw new Error("URL is required for url navigation");
        }
        targetUrl = url;
      }

      // Validate the target URL
      try {
        new URL(targetUrl);
      } catch (urlError) {
        throw new Error(`Invalid target URL: ${targetUrl}`);
      }

      console.log(
        `Navigating tab ${tabId} from ${previousUrl} to ${targetUrl}`,
      );

      // Update the tab URL directly - this will cause navigation
      await chrome.tabs.update(tabId, { url: targetUrl });

      // Return success immediately for page-reloading navigation
      // We can't wait for the content script response because it gets destroyed during navigation
      const result = {
        success: true,
        action,
        currentUrl: targetUrl,
        previousUrl,
        loadTime: Date.now() - startTime,
        message: `Successfully initiated ${action} navigation to ${targetUrl}`,
      };

      console.log("Navigate tool result:", result);

      const gensx = await getClient();
      await gensx.resume({
        executionId,
        nodeId: event.nodeId,
        data: result,
      });
    } else {
      throw new Error(`Unsupported navigation action: ${action}`);
    }
  } catch (error) {
    console.error("Navigate tool execution failed:", error);

    // Resume workflow with error information
    const gensx = await getClient();
    await gensx.resume({
      executionId,
      nodeId: event.nodeId,
      data: {
        success: false,
        error: error instanceof Error ? error.message : "Navigation failed",
      },
    });
  }
}

// Geolocation handling functions
async function hasOffscreenDocument() {
  // For now, we'll assume we need to create the document
  // In a real implementation, you might want to track this state
  return false;
}

async function setupOffscreenDocument() {
  // If we do not have a document, we are already setup and can skip
  if (!(await hasOffscreenDocument())) {
    // Create offscreen document
    if (creating) {
      await creating;
    } else {
      creating = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [
          chrome.offscreen.Reason.GEOLOCATION ||
            chrome.offscreen.Reason.DOM_SCRAPING,
        ],
        justification: "Geolocation access for extension tools",
      });

      await creating;
      creating = null;
    }
  }
}

async function closeOffscreenDocument() {
  if (!(await hasOffscreenDocument())) {
    return;
  }
  await chrome.offscreen.closeDocument();
}

async function getGeolocation(params: any) {
  await setupOffscreenDocument();
  const geolocation = await chrome.runtime.sendMessage({
    type: "get-geolocation",
    target: "offscreen",
    params,
  });
  await closeOffscreenDocument();
  return geolocation;
}

async function handleGeolocationRequest(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  try {
    console.log("Handling geolocation request:", message);

    const geolocation = await getGeolocation(message.data);

    sendResponse({
      success: true,
      data: geolocation,
    });
  } catch (error) {
    console.error("Geolocation request failed:", error);
    sendResponse({
      success: false,
      error:
        error instanceof Error ? error.message : "Geolocation request failed",
    });
  }
}
