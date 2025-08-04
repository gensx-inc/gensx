/**
 * Background Worker - Orchestrator, Site Graph, and Tool Adapters
 * Implements the background responsibilities from the rearchitecture specification
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

// Global state
const siteGraph: SiteGraph = {
  nodes: new Map(),
  edges: new Map()
};

const activeTasks = new Map<string, Task>();
const tabActionQueues = new Map<number, Array<() => Promise<any>>>();
const ports = new Map<number, chrome.runtime.Port>();

// Initialize background worker
console.log('🎯 GenSX Copilot Background Worker starting...');

chrome.runtime.onInstalled.addListener(() => {
  console.log('✅ GenSX Copilot extension installed');
});

// Handle connections from content scripts
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

// Handle messages from popup and other extension contexts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Background received message:', message);
  
  switch (message.type) {
    case 'GET_TAB_INFO':
      handleGetTabInfo(sendResponse);
      return true;
      
    case 'TASK_CREATE':
      handleTaskCreate(message.data, sendResponse);
      return true;
      
    case 'TASK_CANCEL':
      handleTaskCancel(message.data, sendResponse);
      return true;
      
    case 'GET_SITE_GRAPH':
      handleGetSiteGraph(sendResponse);
      return true;
      
    case 'WORKFLOW_REQUEST':
      handleWorkflowRequest(message, sendResponse);
      return true;
      
    case 'GET_THREAD_HISTORY':
      handleGetThreadHistory(message.data, sendResponse);
      return true;
      
    default:
      return false;
  }
});

// Tab management
chrome.tabs.onRemoved.addListener((tabId) => {
  ports.delete(tabId);
  tabActionQueues.delete(tabId);
  
  // Clean up site graph nodes that might reference this tab
  // For now, keep all nodes - could add tab-specific cleanup later
  
  console.log(`🗑️  Cleaned up state for closed tab ${tabId}`);
});

/**
 * Handle messages from content scripts
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
        
      case 'pcd.query':
        result = await executeOnTab(tabId, 'pcd.query', message.payload);
        break;
        
      case 'getDetails':
        result = await executeOnTab(tabId, 'getDetails', message.payload);
        break;
        
      case 'dom.click':
        result = await executeOnTab(tabId, 'dom.click', message.payload);
        break;
        
      case 'dom.type':
        result = await executeOnTab(tabId, 'dom.type', message.payload);
        break;
        
      case 'dom.select':
        result = await executeOnTab(tabId, 'dom.select', message.payload);
        break;
        
      case 'dom.submit':
        result = await executeOnTab(tabId, 'dom.submit', message.payload);
        break;
        
      case 'dom.scroll':
        result = await executeOnTab(tabId, 'dom.scroll', message.payload);
        break;
        
      case 'dom.waitFor':
        result = await executeOnTab(tabId, 'dom.waitFor', message.payload);
        break;
        
      case 'dom.extract':
        result = await executeOnTab(tabId, 'dom.extract', message.payload);
        break;
        
      case 'capture.candidates':
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
 * Execute tool on specific tab with action queue
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
 * Process action queue for a tab
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
 * Retry with alternative selectors
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
 * Handle tab management tools
 */
async function handleTabsOpen(url: string): Promise<ToolResult<{ tabId: number }>> {
  try {
    const tab = await chrome.tabs.create({ url });
    return {
      ok: true,
      data: { tabId: tab.id! }
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to open tab',
      retryable: true
    };
  }
}

async function handleTabsSwitch(tabId: number): Promise<ToolResult<{}>> {
  try {
    await chrome.tabs.update(tabId, { active: true });
    const tab = await chrome.tabs.get(tabId);
    await chrome.windows.update(tab.windowId, { focused: true });
    
    return { ok: true, data: {} };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to switch tab',
      retryable: true
    };
  }
}

async function handleTabsClose(tabId: number): Promise<ToolResult<{}>> {
  try {
    await chrome.tabs.remove(tabId);
    return { ok: true, data: {} };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to close tab',
      retryable: true
    };
  }
}

/**
 * Handle screenshot capture with highlighted elements
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
 * Update site graph with new observations
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

/**
 * Beam search exploration (placeholder implementation)
 */
async function performBeamSearch(
  goal: string, 
  startUrl: string
): Promise<{ bestTab: number | null; score: number }> {
  
  // This is a simplified implementation
  // Full implementation would use the exploration service from gensx/llm/exploration.ts
  
  const candidates: Array<{ tabId: number; score: number }> = [];
  
  // Open multiple tabs and evaluate
  for (let i = 0; i < EXPLORATION_CONFIG.BEAM_WIDTH; i++) {
    try {
      const tab = await chrome.tabs.create({ url: startUrl, active: false });
      
      // Wait for page load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get MiniPCD and evaluate
      const miniPCDResult = await executeOnTab(tab.id!, 'getMiniPCD', {});
      
      if (miniPCDResult.ok) {
        const score = calculateGoalScore(miniPCDResult.data as MiniPCD, goal);
        candidates.push({ tabId: tab.id!, score });
        
        if (score < EXPLORATION_CONFIG.MIN_CONFIDENCE_THRESHOLD) {
          // Close low-scoring tabs
          await chrome.tabs.remove(tab.id!);
        }
      }
      
    } catch (error) {
      console.warn('Beam search tab creation failed:', error);
    }
  }
  
  // Return best candidate
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  
  // Close all but the best tab
  for (let i = 1; i < candidates.length; i++) {
    try {
      await chrome.tabs.remove(candidates[i].tabId);
    } catch (error) {
      console.warn('Failed to close exploration tab:', error);
    }
  }
  
  return {
    bestTab: best?.tabId || null,
    score: best?.score || 0
  };
}

/**
 * Calculate goal score for a page (placeholder)
 */
function calculateGoalScore(miniPCD: MiniPCD, goal: string): number {
  // Simplified goal scoring
  const goalLower = goal.toLowerCase();
  let score = 0;
  
  // Check actions for goal relevance
  for (const action of miniPCD.actions) {
    if (action.label.toLowerCase().includes(goalLower)) {
      score += 0.3;
    }
    if (action.kind && goalLower.includes(action.kind)) {
      score += 0.2;
    }
  }
  
  // Check forms
  for (const form of miniPCD.forms) {
    if (form.purpose && goalLower.includes(form.purpose)) {
      score += 0.4;
    }
  }
  
  return Math.min(score, 1.0);
}

// Handler implementations for popup messages

async function handleGetTabInfo(sendResponse: (response: any) => void): Promise<void> {
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (activeTab && activeTab.id && activeTab.url && activeTab.title) {
      const domain = new URL(activeTab.url).hostname;
      sendResponse({
        success: true,
        tabInfo: {
          id: activeTab.id,
          url: activeTab.url,
          title: activeTab.title,
          domain
        }
      });
    } else {
      sendResponse({
        success: false,
        error: 'No active tab found'
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get tab info'
    });
  }
}

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
    
    // Start task execution (would integrate with LLM controller)
    // For now, just return the task ID
    
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

/**
 * Handle workflow requests from popup - forward to GenSX server
 */
async function handleWorkflowRequest(
  message: any,
  sendResponse: (response: any) => void
): Promise<void> {
  
  try {
    console.log('🚀 Starting workflow request:', message.requestId);
    
    // Send execution started message to popup
    chrome.runtime.sendMessage({
      type: 'WORKFLOW_EXECUTION_STARTED',
      requestId: message.requestId,
      data: {
        executionId: `exec_${Date.now()}`
      }
    });
    
    // For now, make a direct call to the copilot workflow
    // In a full implementation, this would go through the GenSX server
    const workflowUrl = 'http://localhost:3000/workflow/copilot';
    
    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message.data)
    });
    
    if (!response.ok) {
      throw new Error(`Workflow server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Send final response to popup
    chrome.runtime.sendMessage({
      type: 'WORKFLOW_STREAM_COMPLETE',
      requestId: message.requestId,
      data: {
        finalMessage: result.response || 'Task completed'
      }
    });
    
    sendResponse({ success: true });
    
  } catch (error) {
    console.error('Workflow request failed:', error);
    
    // Send error to popup
    chrome.runtime.sendMessage({
      type: 'WORKFLOW_ERROR',
      requestId: message.requestId,
      error: error instanceof Error ? error.message : 'Workflow execution failed'
    });
    
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Workflow execution failed'
    });
  }
}

/**
 * Handle thread history requests from popup
 */
async function handleGetThreadHistory(
  data: { userId: string; threadId: string },
  sendResponse: (response: any) => void
): Promise<void> {
  
  try {
    console.log('📚 Loading thread history:', data.threadId);
    
    // For now, make a direct call to the getChatHistoryWorkflow
    // In a full implementation, this would go through the GenSX server
    const historyUrl = 'http://localhost:3000/workflow/fetchChatHistory';
    
    const response = await fetch(historyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: data.userId,
        threadId: data.threadId
      })
    });
    
    if (!response.ok) {
      throw new Error(`History server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    sendResponse({
      success: true,
      messages: result.messages || []
    });
    
  } catch (error) {
    console.error('Thread history request failed:', error);
    
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load thread history',
      messages: []
    });
  }
}

console.log('✅ GenSX Copilot Background Worker initialized');