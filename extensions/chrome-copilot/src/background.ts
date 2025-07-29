// GenSX Copilot Chrome Extension Background Script

import {
  ExtensionMessage,
  TabInfo,
  WorkflowMessage,
  SettingsManager,
} from "./types/copilot";
import { GenSX } from "@gensx/client";

chrome.runtime.onInstalled.addListener(() => {
  console.log("GenSX Copilot extension installed");
});

// Store for managing ongoing workflow requests
const pendingRequests = new Map<string, (response: any) => void>();

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log("Background received message:", message);

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

    // Get current settings
    const settings = await SettingsManager.get();
    console.log("Using settings:", {
      endpoint: settings.apiEndpoint,
      hasApiKey: !!settings.apiKey,
      org: settings.org,
      project: settings.project,
      environment: settings.environment,
    });

    // Create GenSX client
    const gensx = new GenSX({
      apiKey: settings.apiKey,
      baseUrl: settings.apiEndpoint,
    });

    // Execute the copilot workflow
    const response = await gensx.runRaw("copilot", {
      org: settings.org,
      project: settings.project,
      environment: settings.environment,
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

    // Send error response back to content script
    sendResponse({
      type: "WORKFLOW_ERROR",
      requestId,
      error: error instanceof Error ? error.message : "Unknown error occurred",
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
  let currentMessage = "";
  let isComplete = false;

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
          console.log("Processing streaming event:", line);
          try {
            const event = JSON.parse(line);
            await processStreamingEvent(event, requestId, sender, currentMessage);

            // Update current message if this is a text append
            if (event.type === "object" &&
                event.label === "messages" &&
                event.patches?.[0]?.op === "string-append") {
              currentMessage += event.patches[0].value;
            } else if (event.type === "object" &&
                      event.label === "messages" &&
                      event.patches?.[0]?.op === "add") {
              // Reset message for new assistant message
              const messageContent = event.patches[0].value?.messages?.[0]?.content?.[0]?.text;
              if (messageContent) {
                currentMessage = messageContent;
              }
            }
          } catch (parseError) {
            console.warn("Failed to parse streaming event:", line, parseError);
          }
        }
      }
    }

    // Send final completion message
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "WORKFLOW_STREAM_COMPLETE",
        requestId,
        data: {
          finalMessage: currentMessage
        }
      });
    }

    console.log("Streaming completed for request:", requestId);

  } catch (streamError) {
    console.error("Error processing stream:", streamError);

    // Send error to content script
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "WORKFLOW_ERROR",
        requestId,
        error: streamError instanceof Error ? streamError.message : "Streaming error occurred"
      });
    }
  } finally {
    reader.releaseLock();
  }
}

// Process individual streaming events
async function processStreamingEvent(
  event: any,
  requestId: string,
  sender: chrome.runtime.MessageSender,
  currentMessage: string,
) {
  // Only process text streaming events for the UI
  if (event.type === "object" &&
      event.label === "messages" &&
      event.patches?.[0]?.op === "string-append") {

    const appendText = event.patches[0].value;
    const updatedMessage = currentMessage + appendText;

    // Send incremental update to content script
    if (sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "WORKFLOW_STREAM_UPDATE",
        requestId,
        data: {
          text: updatedMessage,
          isIncremental: true
        }
      });
    }
  } else if (event.type === "object" &&
            event.label === "messages" &&
            event.patches?.[0]?.op === "add") {

    // Initial message content
    const messageContent = event.patches[0].value?.messages?.[0]?.content?.[0]?.text;
    if (messageContent && sender.tab?.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "WORKFLOW_STREAM_UPDATE",
        requestId,
        data: {
          text: messageContent,
          isIncremental: false
        }
      });
    }
  }
}

// Handle browser action click (extension icon)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Send message to content script to toggle the copilot
    const message: ExtensionMessage = { type: "TOGGLE_COPILOT" };
    chrome.tabs.sendMessage(tab.id, message);
  }
});

// Content script is automatically injected via manifest.json content_scripts
// No need for manual injection since we have matches: ["<all_urls>"]
