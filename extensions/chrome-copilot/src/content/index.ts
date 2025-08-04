/**
 * Content Script - New Architecture Wiring and Observers
 * Implements content script responsibilities from the rearchitecture specification
 */

import { ContentMessage, BackgroundMessage, ToolResult } from '../shared/types';
import { PORTS } from '../shared/constants';
import { initializePCD, getMiniPCD, queryPCD, getDetails, cleanup } from './pcd';
import { domToolImplementations } from './tool-implementations';

declare global {
  interface Window {
    gensxCopilotInjected?: boolean;
    $?: any; // jQuery
  }
}

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.gensxCopilotInjected) {
    console.log('🔄 GenSX Copilot already injected, skipping');
    return;
  }
  window.gensxCopilotInjected = true;
  console.log('🚀 GenSX Copilot content script loading on:', window.location.href);

  // Initialize MiniPCD system
  initializePCD();

  // Connect to background worker
  const port = chrome.runtime.connect({ name: PORTS.CONTENT_TO_BACKGROUND });
  let backgroundConnected = true;

  port.onMessage.addListener((message) => {
    console.log('📨 Content received message from background:', message);
    
    if (message.type === 'tool_result') {
      // Handle tool result responses
      handleToolResult(message.result);
    }
  });

  port.onDisconnect.addListener(() => {
    console.log('🔌 Background port disconnected');
    backgroundConnected = false;
  });

  // Legacy message listener for direct communication
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('📨 Content script received direct message:', message);

    switch (message.type) {
      case 'TOOL_EXECUTION':
        handleToolExecution(message, sendResponse);
        return true; // Async response

      case 'GET_ELEMENT_POSITIONS':
        handleGetElementPositions(message, sendResponse);
        return true; // Async response

      case 'EXTERNAL_TOOL_CALL':
        // Legacy support
        handleLegacyToolCall(message, sendResponse);
        return true; // Async response

      default:
        return false; // Not handling this message
    }
  });

  /**
   * Handle tool execution requests
   */
  async function handleToolExecution(
    message: { toolName: string; args: any },
    sendResponse: (response: any) => void
  ): Promise<void> {
    
    try {
      const { toolName, args } = message;
      console.log(`🔧 Executing tool: ${toolName}`, args);

      let result: ToolResult;

      // Route to appropriate tool implementation
      const toolImpl = (domToolImplementations as any)[toolName];
      
      if (toolImpl) {
        result = await toolImpl(args);
      } else {
        result = {
          ok: false,
          error: `Unknown tool: ${toolName}`,
          retryable: false
        };
      }

      console.log(`✅ Tool ${toolName} completed:`, result);

      sendResponse({
        success: result.ok,
        data: result.ok ? result.data : undefined,
        observation: result.ok ? result.data : undefined,
        error: result.ok ? undefined : result.error,
        retryable: result.ok ? undefined : result.retryable,
        code: result.ok ? undefined : (result as any).code
      });

    } catch (error) {
      console.error('Tool execution failed:', error);

      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        retryable: true
      });
    }
  }

  /**
   * Handle element position requests for screenshots
   */
  async function handleGetElementPositions(
    message: { ids: string[] },
    sendResponse: (response: any) => void
  ): Promise<void> {
    
    try {
      const positions = [];
      
      for (const id of message.ids) {
        const element = document.querySelector(`[data-pcd-id="${id}"]`);
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const label = element.textContent?.trim() || element.getAttribute('aria-label') || 'Element';
          
          positions.push({
            id,
            x: rect.left,
            y: rect.top,
            w: rect.width,
            h: rect.height,
            label: label.substring(0, 50)
          });
        }
      }
      
      sendResponse({
        success: true,
        data: { positions }
      });
      
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get element positions'
      });
    }
  }

  /**
   * Handle legacy tool calls (backward compatibility)
   */
  async function handleLegacyToolCall(
    message: any,
    sendResponse: (response: any) => void
  ): Promise<void> {
    
    const { requestId, data } = message;

    try {
      // Map legacy tool names to new implementations
      const legacyToolMap: Record<string, string> = {
        'fetchPage': 'getMiniPCD',
        'interact': 'dom.click', // Simplified mapping
        'navigate': 'dom.click'   // Simplified mapping
      };

      const mappedToolName = legacyToolMap[data.toolName] || data.toolName;
      const toolImpl = (domToolImplementations as any)[mappedToolName];

      if (!toolImpl) {
        throw new Error(`Legacy tool not supported: ${data.toolName}`);
      }

      const result = await toolImpl(data.params);

      sendResponse({
        type: 'EXTERNAL_TOOL_RESPONSE',
        requestId,
        data: {
          toolName: data.toolName,
          nodeId: data.nodeId,
          result,
        }
      });

    } catch (error) {
      console.error('Legacy tool execution failed:', error);

      sendResponse({
        type: 'EXTERNAL_TOOL_RESPONSE',
        requestId,
        data: {
          toolName: data.toolName,
          nodeId: data.nodeId,
          result: null,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Handle tool result from background
   */
  function handleToolResult(result: ToolResult): void {
    console.log('📨 Received tool result:', result);
    // This would be used for coordinated multi-step operations
    // For now, just log it
  }

  /**
   * Send message to background via port or fallback
   */
  function sendToBackground(message: ContentMessage): void {
    if (backgroundConnected) {
      port.postMessage(message);
    } else {
      // Fallback to direct runtime messaging
      chrome.runtime.sendMessage(message);
    }
  }

  // Navigation observer for MiniPCD updates
  let lastUrl = window.location.href;
  
  const checkUrlChange = () => {
    if (window.location.href !== lastUrl) {
      console.log('🔄 URL changed, updating MiniPCD');
      lastUrl = window.location.href;
      
      // Trigger MiniPCD rebuild
      setTimeout(() => {
        getMiniPCD(); // This will trigger a rebuild if needed
      }, 500);
    }
  };

  // Check for URL changes (SPA navigation)
  setInterval(checkUrlChange, 1000);

  // Listen for browser navigation events
  window.addEventListener('popstate', checkUrlChange);
  window.addEventListener('pushstate', checkUrlChange);
  window.addEventListener('replacestate', checkUrlChange);

  // Cleanup when page unloads
  window.addEventListener('beforeunload', () => {
    cleanup();
    
    if (backgroundConnected) {
      port.disconnect();
    }
  });

  console.log('✅ GenSX Copilot content script initialized with new architecture');
})();