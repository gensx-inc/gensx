// GenSX Copilot Chrome Extension Background Script

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

// Store the current workflow's tab ID to avoid "no active tab" issues when browser is not focused
let currentWorkflowTabId: number | null = null;

// Offscreen document management for geolocation
const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';
let creating: Promise<void> | null = null; // A global promise to avoid concurrency issues

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ GenSX Copilot extension installed');
});

// Handle extension icon click to open side panel
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    console.log('📋 Opening side panel for tab:', tab.id);
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});

const getClient = async () => {
  const settings = await SettingsManager.get();
  return new GenSX({
    apiKey: settings.apiKey,
    baseUrl: settings.apiEndpoint,
  });
}

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("Background received message:", message);

    if (message.type === "CONTENT_SCRIPT_READY") {
      console.log('✅ Content script ready on tab:', sender.tab?.id, message.url);
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

    if (message.type === "GET_WEBSITE_KNOWLEDGE") {
      handleGetWebsiteKnowledge(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "DELETE_WEBSITE_KNOWLEDGE") {
      handleDeleteWebsiteKnowledge(message, sender, sendResponse);
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "UPDATE_CURRENT_TAB") {
      // Update the current workflow tab ID (called when popup opens)
      (async () => {
        try {
          const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
          if (activeTab && activeTab.id) {
            currentWorkflowTabId = activeTab.id;
            console.log("Updated current workflow tab ID:", currentWorkflowTabId);
            sendResponse({ success: true, tabId: currentWorkflowTabId });
          } else {
            sendResponse({ success: false, error: "No active tab found" });
          }
        } catch (error) {
          console.warn("Failed to update current tab:", error);
          sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
        }
      })();
      return true; // Indicates we will send a response asynchronously
    }

    if (message.type === "GET_GEOLOCATION") {
      handleGeolocationRequest(message, sender, sendResponse);
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

    // Store the tab ID for this workflow to avoid "no active tab" issues
    if (data.tabId) {
      currentWorkflowTabId = data.tabId;
      console.log("Stored workflow tab ID:", currentWorkflowTabId);
    } else {
      // Fallback to trying to get active tab if no tab ID provided
      try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
          currentWorkflowTabId = activeTab.id;
          console.log("Fallback: stored active tab ID:", currentWorkflowTabId);
        }
      } catch (error) {
        console.warn("Could not determine tab ID for workflow:", error);
      }
    }

    // Create GenSX client
    const gensx = await getClient();

    // Execute the copilot workflow
    const response = await gensx.runRaw("copilot", {
      inputs: {
        prompt: data.prompt,
        threadId: data.threadId,
        userId: data.userId,
        url: data.url,
        userName: data.userName,
        userContext: data.userContext,
      },
    });

    console.log("Starting to process streaming response for request:", requestId);

    // Process the streaming response
    await processStreamingResponse(response, requestId, sender);

  } catch (error) {
    console.error("Workflow execution failed for request:", requestId, error);

    // Send error response to popup
    chrome.runtime.sendMessage({
      type: "WORKFLOW_ERROR",
      requestId,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    }).catch(() => {
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
    const { output: threadData } = await gensx.run<{ messages: CoreMessage[] }>("fetchChatHistory", {
      inputs: { userId, threadId }
    });

    console.log("fetchChatHistory workflow output:", threadData);

    let messages: CoreMessage[] = [];
    if (threadData?.messages && Array.isArray(threadData.messages)) {
      messages = threadData.messages;
    }

    console.log("Retrieved thread history:", messages.length, "messages");

    // Convert GenSX messages to popup-compatible format
    const convertedMessages = messages
      .filter((msg: any) => msg.role !== 'system') // Filter out system messages for UI
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        toolCalls: msg.toolCalls
      }));

    console.log("Converted messages for popup:", convertedMessages.length, "messages");

    sendResponse({
      success: true,
      messages: convertedMessages
    });

  } catch (error) {
    console.error("Failed to get thread history:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve thread history",
      messages: []
    });
  }
}

// Handle website knowledge base retrieval
async function handleGetWebsiteKnowledge(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { data } = message;
  const { userId, domain } = data;

  try {
    console.log("Getting website knowledge for:", userId, domain);

    const gensx = await getClient();

    console.log("Running getWebsiteKnowledgeBase workflow...");
    const { output: knowledgeData } = await gensx.run<{ content: string; exists: boolean }>("getWebsiteKnowledgeBase", {
      inputs: { userId, domain }
    });

    console.log("getWebsiteKnowledgeBase workflow output:", knowledgeData);

    sendResponse({
      success: true,
      content: knowledgeData?.content || "",
      exists: knowledgeData?.exists || false
    });

  } catch (error) {
    console.error("Failed to get website knowledge:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Failed to retrieve website knowledge",
      content: "",
      exists: false
    });
  }
}

// Handle website knowledge base deletion
async function handleDeleteWebsiteKnowledge(
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { data } = message;
  const { userId, domain } = data;

  try {
    console.log("Deleting website knowledge for:", userId, domain);

    const gensx = await getClient();

    console.log("Running deleteWebsiteKnowledgeBase workflow...");
    const { output: deleteResult } = await gensx.run<{ success: boolean; message: string }>("deleteWebsiteKnowledgeBase", {
      inputs: { userId, domain }
    });

    console.log("deleteWebsiteKnowledgeBase workflow output:", deleteResult);

    sendResponse({
      success: deleteResult?.success || false,
      message: deleteResult?.message || "Unknown result"
    });

  } catch (error) {
    console.error("Failed to delete website knowledge:", error);
    sendResponse({
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete website knowledge"
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

    console.log("Reconnection successful, processing progress stream:", executionId);

    // Create a Response-like object with the stream for compatibility
    const response = new Response(stream, {
      headers: { 'content-type': 'application/x-ndjson' }
    });

    // Process the streaming response from the reconnection
    await processStreamingResponse(response, requestId, sender);

  } catch (error) {
    console.error("Workflow reconnection failed for execution:", executionId, error);

    // Send error response to popup
    chrome.runtime.sendMessage({
      type: "WORKFLOW_ERROR",
      requestId,
      error: error instanceof Error ? error.message : "Reconnection failed",
    }).catch(() => {
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
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep the incomplete line in buffer

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            console.log("Processing streaming event:", event, executionId);

            if (event.type === "start") {
              executionId = event.workflowExecutionId;

              // Send execution ID to popup for state tracking
              chrome.runtime.sendMessage({
                type: "WORKFLOW_EXECUTION_STARTED",
                requestId,
                data: {
                  executionId
                }
              }).catch(() => {
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
              todoListState = applyObjectPatches(event.patches, todoListState) as TodoList;
              console.log("Updated todo list state:", todoListState);
            }

            await processStreamingEvent(executionId, event, requestId, sender, messagesState, todoListState);
          } catch (parseError) {
            console.warn("Failed to parse streaming event:", line, parseError);
          }
        }
      }
    }

    // Send final completion message to popup
    chrome.runtime.sendMessage({
      type: "WORKFLOW_STREAM_COMPLETE",
      requestId,
      data: {
        finalMessage: ""
      }
    }).catch(() => {
      // Ignore errors if popup is not open
    });

    console.log("Streaming completed for request:", requestId);

  } catch (streamError) {
    console.error("Error processing stream:", streamError);

    // Send error to popup
    chrome.runtime.sendMessage({
      type: "WORKFLOW_ERROR",
      requestId,
      error: streamError instanceof Error ? streamError.message : "Streaming error occurred"
    }).catch(() => {
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

    // Send tool call to content script for execution
    // Use the stored workflow tab ID instead of querying for active tab
    try {
      const tabId = currentWorkflowTabId;
      if (!tabId) {
        throw new Error("No workflow tab ID available for tool execution");
      }

      // Get tab info for logging
      const tab = await chrome.tabs.get(tabId);
      console.log("Sending tool call to workflow tab:", tabId, tab.url);

      // Try to send message to content script, with fallback to inject if needed
      let toolResponse;
      try {
        toolResponse = await chrome.tabs.sendMessage(tabId, {
          type: "EXTERNAL_TOOL_CALL",
          requestId,
          data: {
            toolName: event.toolName,
            params: event.params,
            nodeId: event.nodeId,
            paramsSchema: event.paramsSchema,
            resultSchema: event.resultSchema
          }
        });
      } catch (connectionError) {
        console.warn("Content script connection failed, attempting to inject:", connectionError);

        // Try to inject the content script manually
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });

          // Wait a bit for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));

          // Retry the message
          toolResponse = await chrome.tabs.sendMessage(tabId, {
            type: "EXTERNAL_TOOL_CALL",
            requestId,
            data: {
              toolName: event.toolName,
              params: event.params,
              nodeId: event.nodeId,
              paramsSchema: event.paramsSchema,
              resultSchema: event.resultSchema
            }
          });
        } catch (injectionError) {
          console.error("Failed to inject content script:", injectionError);
          throw new Error(`Content script injection failed: ${injectionError instanceof Error ? injectionError.message : String(injectionError)}`);
        }
      }

      console.log("Tool execution response:", toolResponse);

      const gensx = await getClient();

      await gensx.resume({
        executionId,
        nodeId: event.nodeId,
        data: toolResponse.data.result
      });
    } catch (error) {
      console.error("Tool execution failed:", error);
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
        isIncremental: event.patches?.some((p: any) => p.op === "string-append")
      }
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
        todoList: todoListState
      }
    };

    // Send to popup and other extension contexts
    chrome.runtime.sendMessage(todoListData).catch(() => {
      // Ignore errors if popup is not open
    });
  }
}

// Browser action now opens popup by default (configured in manifest.json)

// Content script is automatically injected via manifest.json content_scripts
// No need for manual injection since we have matches: ["<all_urls>"]

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
        reasons: [chrome.offscreen.Reason.GEOLOCATION || chrome.offscreen.Reason.DOM_SCRAPING],
        justification: 'Geolocation access for extension tools',
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
    type: 'get-geolocation',
    target: 'offscreen',
    params
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
      data: geolocation
    });
  } catch (error) {
    console.error("Geolocation request failed:", error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : "Geolocation request failed"
    });
  }
}
