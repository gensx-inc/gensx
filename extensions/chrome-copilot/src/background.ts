/**
 * Background Worker - GenSX Client Integration + Orchestrator
 * Combines the original GenSX client streaming with new architecture
 */

import { 
  ContentMessage, 
  BackgroundMessage, 
  ToolCall, 
  ToolResult, 
  SiteGraph, 
  SiteGraphNode, 
  Task,
  MiniPCD,
  Observation
} from './shared/types';
import { EXPLORATION_CONFIG, PORTS } from './shared/constants';

// Import original popup integration types
import {
  ExtensionMessage,
  TabInfo,
  WorkflowMessage,
  SettingsManager,
} from "./types/copilot";
import { GenSX } from "@gensx/client";
import { applyObjectPatches } from "./utils/workflow-state";
import { type CoreMessage } from "ai";

// Global state - combining new architecture with original
const siteGraph: SiteGraph = {
  nodes: new Map(),
  edges: new Map()
};

const activeTasks = new Map<string, Task>();
const tabActionQueues = new Map<number, Array<() => Promise<any>>>();
const ports = new Map<number, chrome.runtime.Port>();

// Store for managing ongoing workflow requests (original)
const pendingRequests = new Map<string, (response: any) => void>();

// Initialize background worker
console.log('🎯 GenSX Copilot Background Worker starting...');

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ GenSX Copilot extension installed');
});

// GenSX client helper (original)
const getClient = async () => {
  const settings = await SettingsManager.get();
  return new GenSX({
    apiKey: settings.apiKey,
    baseUrl: settings.apiEndpoint,
  });
}

// Handle connections from content scripts (new architecture)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === PORTS.CONTENT_TO_BACKGROUND) {
    const tabId = port.sender?.tab?.id;
    if (tabId) {
      ports.set(tabId, port);
      console.log(`🔌 Content script connected from tab ${tabId}`);
      
      port.onMessage.addListener((message: ContentMessage) => {
        handleContentMessage(tabId, message, port);
      });
      
      port.onDisconnect.addListener(() => {
        ports.delete(tabId);
        console.log(`🔌 Content script disconnected from tab ${tabId}`);
      });
    }
  }
});

// Handle messages from popup and other extension contexts (hybrid approach)
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  // Original popup integration handlers
  if (message.type === "CONTENT_SCRIPT_READY") {
    console.log('✅ Content script ready on tab:', sender.tab?.id, message.url);
    return false;
  }

  if (message.type === "GET_TAB_INFO") {
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
    return true;
  }

  if (message.type === "WORKFLOW_REQUEST") {
    handleWorkflowRequest(message as WorkflowMessage, sender, sendResponse);
    return true;
  }

  if (message.type === "WORKFLOW_RECONNECT") {
    handleWorkflowReconnect(message, sender, sendResponse);
    return true;
  }

  if (message.type === "GET_THREAD_HISTORY") {
    handleGetThreadHistory(message, sender, sendResponse);
    return true;
  }

  // New architecture handlers
  switch (message.type) {
    case 'TASK_CREATE':
      handleTaskCreate(message.data, sendResponse);
      return true;
      
    case 'TASK_CANCEL':
      handleTaskCancel(message.data, sendResponse);
      return true;
      
    case 'GET_SITE_GRAPH':
      handleGetSiteGraph(sendResponse);
      return true;
      
    default:
      return false;
  }
});

// Tab management (new architecture + cleanup)
chrome.tabs.onRemoved.addListener((tabId) => {
  ports.delete(tabId);
  tabActionQueues.delete(tabId);
  
  // Clean up site graph nodes that might reference this tab
  // For now, keep all nodes - could add tab-specific cleanup later
  
  console.log(`🗑️  Cleaned up state for closed tab ${tabId}`);
});

/**
 * Handle messages from content scripts (new architecture)
 */
async function handleContentMessage(
  tabId: number, 
  message: ContentMessage, 
  port: chrome.runtime.Port
): Promise<void> {
  
  try {
    let result: ToolResult;
    
    switch (message.type) {
      case 'getMiniPCD':
        result = await executeOnTab(tabId, 'getMiniPCD', {});
        break;
        
      case 'pcd_query':
        result = await executeOnTab(tabId, 'pcd_query', message.payload);
        break;
        
      case 'getDetails':
        result = await executeOnTab(tabId, 'getDetails', message.payload);
        break;
        
      case 'dom_click':
        result = await executeOnTab(tabId, 'dom_click', message.payload);
        break;
        
      case 'dom_type':
        result = await executeOnTab(tabId, 'dom_type', message.payload);
        break;
        
      case 'dom_select':
        result = await executeOnTab(tabId, 'dom_select', message.payload);
        break;
        
      case 'dom_submit':
        result = await executeOnTab(tabId, 'dom_submit', message.payload);
        break;
        
      case 'dom_scroll':
        result = await executeOnTab(tabId, 'dom_scroll', message.payload);
        break;
        
      case 'dom_waitFor':
        result = await executeOnTab(tabId, 'dom_waitFor', message.payload);
        break;
        
      case 'dom_extract':
        result = await executeOnTab(tabId, 'dom_extract', message.payload);
        break;
        
      case 'capture_candidates':
        result = await handleCaptureScreenshot(tabId, message.payload.ids);
        break;
        
      default:
        result = {
          ok: false,
          error: `Unknown message type: ${(message as any).type}`,
          retryable: false
        };
    }
    
    // Send result back through port
    port.postMessage({
      type: 'tool_result',
      result
    });
    
  } catch (error) {
    console.error('Error handling content message:', error);
    
    port.postMessage({
      type: 'tool_result',
      result: {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        retryable: true
      }
    });
  }
}

/**
 * Execute tool on specific tab with action queue (new architecture)
 */
async function executeOnTab(tabId: number, toolName: string, args: any): Promise<ToolResult> {
  // Get or create action queue for this tab
  if (!tabActionQueues.has(tabId)) {
    tabActionQueues.set(tabId, []);
  }
  
  const queue = tabActionQueues.get(tabId)!;
  
  return new Promise((resolve) => {
    const action = async () => {
      try {
        console.log(`🔧 Executing ${toolName} on tab ${tabId}:`, args);
        
        // Send message to content script
        const response = await chrome.tabs.sendMessage(tabId, {
          type: 'TOOL_EXECUTION',
          toolName,
          args
        });
        
        if (response?.success) {
          // Update site graph if we got an observation
          if (response.observation) {
            await updateSiteGraph(tabId, response.observation);
          }
          
          resolve({
            ok: true,
            data: response.data || response.observation
          });
        } else {
          // Try alternative selectors if available
          if (response?.retryable && args.selector) {
            const retryResult = await retryWithAltSelectors(tabId, toolName, args);
            resolve(retryResult);
          } else {
            resolve({
              ok: false,
              error: response?.error || 'Tool execution failed',
              retryable: response?.retryable || false,
              code: response?.code
            });
          }
        }
        
      } catch (error) {
        console.error(`Tool execution failed on tab ${tabId}:`, error);
        resolve({
          ok: false,
          error: error instanceof Error ? error.message : 'Execution error',
          retryable: true
        });
      }
    };
    
    // Add to queue
    queue.push(action);
    
    // Process queue if it's the only item
    if (queue.length === 1) {
      processTabQueue(tabId);
    }
  });
}

/**
 * Process action queue for a tab (new architecture)
 */
async function processTabQueue(tabId: number): Promise<void> {
  const queue = tabActionQueues.get(tabId);
  if (!queue || queue.length === 0) return;
  
  while (queue.length > 0) {
    const action = queue.shift()!;
    await action();
  }
}

/**
 * Retry with alternative selectors (new architecture)
 */
async function retryWithAltSelectors(
  tabId: number, 
  toolName: string, 
  originalArgs: any
): Promise<ToolResult> {
  
  // Get alternative selectors from content script
  try {
    const detailsResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'TOOL_EXECUTION',
      toolName: 'getDetails',
      args: { ids: [originalArgs.selector.id] }
    });
    
    if (detailsResponse?.success && detailsResponse.data?.[0]?.altSelectors) {
      const altSelectors = detailsResponse.data[0].altSelectors;
      
      // Try each alternative selector
      for (const altSelector of altSelectors) {
        const retryArgs = { ...originalArgs, selector: altSelector };
        
        const retryResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'TOOL_EXECUTION',
          toolName,
          args: retryArgs
        });
        
        if (retryResponse?.success) {
          console.log(`✅ Retry succeeded with alt selector:`, altSelector);
          return {
            ok: true,
            data: retryResponse.data || retryResponse.observation
          };
        }
      }
    }
    
    return {
      ok: false,
      error: 'All alternative selectors failed',
      retryable: false,
      code: 'ALL_SELECTORS_FAILED'
    };
    
  } catch (error) {
    return {
      ok: false,
      error: 'Failed to retry with alternative selectors',
      retryable: false
    };
  }
}

/**
 * Handle screenshot capture with highlighted elements (new architecture)
 */
async function handleCaptureScreenshot(
  tabId: number, 
  elementIds: string[]
): Promise<ToolResult<{ screenshotBase64: string; boxes: any[] }>> {
  
  try {
    // Get element positions from content script
    const elementsResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_ELEMENT_POSITIONS',
      ids: elementIds
    });
    
    if (!elementsResponse?.success) {
      return {
        ok: false,
        error: 'Failed to get element positions',
        retryable: true
      };
    }
    
    // Capture screenshot
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab({
      format: 'png'
    });
    
    // Remove data URL prefix
    const screenshotBase64 = screenshotDataUrl.replace(/^data:image\/png;base64,/, '');
    
    return {
      ok: true,
      data: {
        screenshotBase64,
        boxes: elementsResponse.data.positions
      }
    };
    
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
      retryable: true
    };
  }
}

/**
 * Update site graph with new observations (new architecture)
 */
async function updateSiteGraph(tabId: number, observation: Observation): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;
    
    // Update or create node
    const existingNode = siteGraph.nodes.get(observation.url);
    const node: SiteGraphNode = {
      url: observation.url,
      title: observation.title,
      visitedAt: observation.ts,
      goalScore: existingNode?.goalScore
    };
    
    siteGraph.nodes.set(observation.url, node);
    
    // Update edges if URL changed
    if (observation.urlChanged && existingNode) {
      // Could add edge tracking here
    }
    
    console.log(`📊 Updated site graph node: ${observation.url}`);
    
  } catch (error) {
    console.warn('Failed to update site graph:', error);
  }
}

// ===== ORIGINAL GENSX CLIENT INTEGRATION =====

/**
 * Handle workflow execution with streaming support (ORIGINAL)
 */
async function handleWorkflowRequest(
  message: WorkflowMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void,
) {
  const { requestId, data } = message;

  try {
    console.log("🚀 Executing workflow for request:", requestId);
    console.log("📝 Workflow data:", data);

    // Create GenSX client
    const gensx = await getClient();
    console.log("✅ GenSX client created");

    // Execute the copilot workflow
    console.log("🔧 Calling gensx.runRaw with copilot workflow...");
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

    console.log("✅ GenSX runRaw completed, response received");
    console.log("📡 Response type:", typeof response);
    console.log("📡 Response status:", response?.status);
    console.log("📡 Response headers:", response?.headers?.get?.('content-type'));

    if (!response) {
      throw new Error("No response received from GenSX workflow");
    }

    console.log("🌊 Starting to process streaming response for request:", requestId);

    // Process the streaming response
    await processStreamingResponse(response, requestId, sender);

    console.log("✅ Streaming response processing completed for request:", requestId);

  } catch (error) {
    console.error("❌ Workflow execution failed for request:", requestId, error);
    console.error("❌ Error details:", (error as Error)?.stack);

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

/**
 * Handle thread history retrieval (ORIGINAL)
 */
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

/**
 * Handle workflow reconnection (ORIGINAL)
 */
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

/**
 * Process streaming JSON lines from GenSX workflow (ORIGINAL)
 */
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

  try {
    console.log("🌊 Starting streaming response processing...");
    
    while (!isComplete) {
      const { value, done } = await reader.read();

      if (done) {
        console.log("🏁 Streaming complete - no more data");
        isComplete = true;
        break;
      }

      // Decode the chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      console.log("📦 Received chunk:", chunk.length, "bytes");
      buffer += chunk;

      // Process complete JSON lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ""; // Keep the incomplete line in buffer
      
      console.log("📄 Processing", lines.length, "lines from buffer");

      for (const line of lines) {
        if (line.trim()) {
          try {
            const event = JSON.parse(line);
            console.log("🎯 Processing streaming event:", event.type, executionId);
            console.log("📋 Event details:", event);

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

            await processStreamingEvent(executionId, event, requestId, sender, messagesState);
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

/**
 * Process individual streaming events (ORIGINAL + ENHANCED)
 */
async function processStreamingEvent(
  executionId: string | undefined,
  event: any,
  requestId: string,
  sender: chrome.runtime.MessageSender,
  messagesState: any,
) {
  // Handle external tool calls with new architecture integration
  if (event.type === "external-tool") {
    if (!executionId) {
      console.error("Execution ID is not set");
      return;
    }

    console.log("External tool call detected:", event);

    // Send tool call to content script for execution
    // Get the active tab since the sender might be from popup
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab || !activeTab.id) {
        throw new Error("No active tab found for tool execution");
      }

      console.log("Sending tool call to active tab:", activeTab.id, activeTab.url);

      // Try to send message to content script, with fallback to inject if needed
      let toolResponse;
      try {
        toolResponse = await chrome.tabs.sendMessage(activeTab.id, {
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
            target: { tabId: activeTab.id },
            files: ['content.js']
          });
          
          // Wait a bit for the script to initialize
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the message
          toolResponse = await chrome.tabs.sendMessage(activeTab.id, {
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

  // Handle output event from Vercel AI streaming result
  if (event.type === "output") {
    console.log("🎯 Processing output event from Vercel AI");
    
    try {
      // Parse the Vercel AI streaming result
      const streamingResult = JSON.parse(event.content);
      console.log("📤 Streaming result object:", streamingResult);
      
      // The Vercel AI result contains streams - we need to process them
      // For now, send a simple completion message to unblock the popup
      chrome.runtime.sendMessage({
        type: "WORKFLOW_STREAM_COMPLETE",
        requestId,
        data: {
          finalMessage: "I can see the page! Let me analyze what's available and help you interact with it."
        }
      }).catch(() => {
        // Ignore errors if popup is not open
      });
      
    } catch (parseError) {
      console.error("Failed to parse output event content:", parseError);
      
      // Send error to popup
      chrome.runtime.sendMessage({
        type: "WORKFLOW_ERROR",
        requestId,
        error: "Failed to process streaming result"
      }).catch(() => {
        // Ignore errors if popup is not open
      });
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
}

// ===== NEW ARCHITECTURE HANDLERS =====

async function handleTaskCreate(
  data: { goal: string; userId: string },
  sendResponse: (response: any) => void
): Promise<void> {
  
  try {
    const taskId = generateTaskId();
    const now = Date.now();
    
    const task: Task = {
      id: taskId,
      userId: data.userId,
      goal: data.goal,
      status: 'created',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      breadcrumbs: [],
      siteGraph: { nodes: 0, edges: 0, recentUrls: [] },
      history: [],
      bindings: {}
    };
    
    activeTasks.set(taskId, task);
    
    sendResponse({
      success: true,
      taskId
    });
    
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create task'
    });
  }
}

async function handleTaskCancel(
  data: { taskId: string },
  sendResponse: (response: any) => void
): Promise<void> {
  
  try {
    const task = activeTasks.get(data.taskId);
    if (task) {
      task.status = 'cancelled';
      task.updatedAt = Date.now();
      
      sendResponse({
        success: true,
        message: 'Task cancelled'
      });
    } else {
      sendResponse({
        success: false,
        error: 'Task not found'
      });
    }
    
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel task'
    });
  }
}

async function handleGetSiteGraph(sendResponse: (response: any) => void): Promise<void> {
  try {
    const graphData = {
      nodes: Array.from(siteGraph.nodes.values()),
      edges: Array.from(siteGraph.edges.entries()).map(([from, edges]) => ({
        from,
        edges
      }))
    };
    
    sendResponse({
      success: true,
      siteGraph: graphData
    });
    
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get site graph'
    });
  }
}

function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

console.log('✅ GenSX Copilot Background Worker initialized with hybrid architecture');