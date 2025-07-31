// GenSX Copilot Chrome Extension Content Script - Tool Execution Only

import { ExtensionMessage, ExternalToolCallMessage } from './types/copilot';
import { toolImplementations } from './tool-implementations';

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
  
  // Notify background script that content script is ready
  try {
    chrome.runtime.sendMessage({
      type: 'CONTENT_SCRIPT_READY',
      url: window.location.href,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('Could not notify background script of readiness:', error);
  }

  // Set up message listener for tool execution
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    console.log('GenSX Copilot content script received message:', message);

    if (message.type === 'EXTERNAL_TOOL_CALL') {
      // Handle external tool calls from background script
      handleExternalToolCall(message as ExternalToolCallMessage, sendResponse);
      return true; // Indicate async response
    }

    return false; // Not handling this message
  });

  // Handle external tool call execution
  async function handleExternalToolCall(
    message: ExternalToolCallMessage,
    sendResponse: (response: any) => void
  ): Promise<void> {
    const { requestId, data } = message;

    try {
      // Get the tool implementation
      const toolImpl = (toolImplementations as any)[data.toolName];
      if (!toolImpl) {
        const availableTools = Object.keys(toolImplementations).join(', ');
        throw new Error(`Tool implementation not found: ${data.toolName}. Available tools: ${availableTools}`);
      }

      // Execute the tool
      console.log('Executing tool:', data.toolName);
      const result = await toolImpl(data.params);
      console.log('Tool execution result:', result);

      // Send successful response
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
      console.error('Tool execution failed:', error);

      // Send error response
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

  console.log('✅ GenSX Copilot content script initialization complete - Tool execution ready');
})();
