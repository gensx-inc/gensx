// GenSX Copilot Chrome Extension Content Script

import { CopilotMessage, CopilotState, ToolCall, ExtensionMessage, SettingsManager, WorkflowMessage, WorkflowStreamUpdateMessage, WorkflowStreamCompleteMessage } from './types/copilot';

declare global {
  interface Window {
    gensxCopilotInjected?: boolean;
    gensxCopilot?: CopilotAPI;
    $?: any; // jQuery
  }
}

interface CopilotAPI {
  togglePane(): void;
  setActiveTab(tab: 'chat' | 'tools' | 'history' | 'details' | 'preferences'): void;
  clearThread(): void;
  toggleTool(toolCallId: string): void;
  startResize(event: MouseEvent): void;
  sendInitCommand(): void;
  dismissHint(): void;
  sendMessage(event: Event): void;
  sendMessageText(text: string): Promise<void>;
}

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.gensxCopilotInjected) {
    console.log('GenSX Copilot already injected, skipping');
    return;
  }
  window.gensxCopilotInjected = true;
  console.log('GenSX Copilot content script loading on:', window.location.href);

  // Set up message listener immediately
  let copilotAPI: CopilotAPI | null = null;

  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    console.log('GenSX Copilot received message:', message);
    
    if (message.type === 'TOGGLE_COPILOT') {
      console.log('Toggling copilot pane');
      if (copilotAPI) {
        copilotAPI.togglePane();
        sendResponse({ success: true });
      } else {
        console.log('Copilot not ready yet, initializing...');
        sendResponse({ success: false, message: 'Copilot still initializing' });
      }
    } else if (message.type === 'WORKFLOW_STREAM_UPDATE') {
      // Handle streaming updates from background script
      handleStreamingUpdate(message as WorkflowStreamUpdateMessage);
    } else if (message.type === 'WORKFLOW_STREAM_COMPLETE') {
      // Handle streaming completion from background script
      handleStreamingComplete(message as WorkflowStreamCompleteMessage);
    } else if (message.type === 'WORKFLOW_ERROR') {
      // Handle workflow errors from background script
      handleWorkflowError(message);
    }
    
    return true; // Keep message channel open for async response
  });

  // Streaming message handlers (declared here, defined inside initializeCopilot)
  let handleStreamingUpdate: (message: WorkflowStreamUpdateMessage) => void;
  let handleStreamingComplete: (message: WorkflowStreamCompleteMessage) => void;
  let handleWorkflowError: (message: any) => void;

  // Initialize copilot asynchronously
  initializeCopilot().catch(error => {
    console.error('Failed to initialize GenSX Copilot:', error);
  });

  // Add jQuery loading function
  function loadJQuery(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window.$ !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
      script.onload = () => {
        console.log('jQuery loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.warn('Failed to load jQuery from CDN, copilot will work with limited functionality');
        resolve(); // Don't fail completely, just continue without jQuery
      };
      document.head.appendChild(script);
    });
  }

  async function initializeCopilot(): Promise<void> {
    console.log('Initializing GenSX Copilot...');

    // Load settings
    const settings = await SettingsManager.get();
    console.log('Settings loaded:', settings);

    // Create the copilot interface
    const copilotRoot = document.createElement('div');
    copilotRoot.id = 'gensx-copilot-root';
    document.body.appendChild(copilotRoot);
    
    // Set up event delegation for form handling
    copilotRoot.addEventListener('submit', (event) => {
      if ((event.target as HTMLElement).id === 'gensx-input-form') {
        event.preventDefault();
        if (copilotAPI) {
          copilotAPI.sendMessage(event);
        }
      }
    });

    // State management
    const state: CopilotState = {
      isOpen: settings.autoOpen,
      paneWidth: settings.defaultWidth,
      isResizing: false,
      activeTab: 'chat',
      messages: [],
      expandedTools: new Set<string>(),
      isStreaming: false,
      userId: localStorage.getItem('gensx-copilot-user-id') || generateUserId(),
      threadId: localStorage.getItem('gensx-copilot-thread-id') || generateThreadId()
    };

    // Streaming state
    let currentStreamingRequestId: string | null = null;
    let currentStreamingMessageIndex: number = -1;

    // Store user and thread IDs
    localStorage.setItem('gensx-copilot-user-id', state.userId);
    localStorage.setItem('gensx-copilot-thread-id', state.threadId);

    function generateUserId(): string {
      return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function generateThreadId(): string {
      return 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function render(): void {
      copilotRoot.innerHTML = `
        ${!state.isOpen ? `
          <button class="gensx-toggle-button" onclick="window.gensxCopilot.togglePane()">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        ` : ''}

        ${state.isOpen ? `
          <div class="gensx-copilot-pane" style="width: ${state.paneWidth}%">
            <div class="gensx-resize-handle" onmousedown="window.gensxCopilot.startResize(event)"></div>

            <div class="gensx-header">
              <div class="gensx-header-content">
                <div class="gensx-header-info">
                  <h3>GenSX Copilot</h3>
                  <p>I can help you interact with this page</p>
                </div>
                <div class="gensx-header-buttons">
                  ${state.activeTab === 'chat' ? `
                    <button class="gensx-header-button" onclick="window.gensxCopilot.clearThread()" title="Start a new chat">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  ` : ''}
                  <button class="gensx-header-button" onclick="window.gensxCopilot.togglePane()" title="Close copilot">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="gensx-tabs">
                <button class="gensx-tab ${state.activeTab === 'chat' ? 'active' : ''}"
                        onclick="window.gensxCopilot.setActiveTab('chat')">Chat</button>
                <button class="gensx-tab ${state.activeTab === 'details' ? 'active' : ''}"
                        onclick="window.gensxCopilot.setActiveTab('details')">App Details</button>
                <button class="gensx-tab ${state.activeTab === 'preferences' ? 'active' : ''}"
                        onclick="window.gensxCopilot.setActiveTab('preferences')">Preferences</button>
              </div>
            </div>

            ${renderTabContent()}
          </div>
        ` : ''}
      `;

      // Adjust main content margin
      adjustMainContentMargin();
    }

    function renderTabContent(): string {
      if (state.activeTab === 'chat') {
        return `
          <div class="gensx-chat-content">
            <div class="gensx-messages" id="gensx-messages">
              ${state.messages.map((message, index) => renderMessage(message, index)).join('')}
              ${renderInitHint()}
            </div>

            <form class="gensx-input-form" id="gensx-input-form">
              <div class="gensx-input-container">
                <input type="text"
                       class="gensx-input"
                       id="gensx-input"
                       placeholder="Ask me to interact with the page..."
                       ${state.isStreaming ? 'disabled' : ''}
                       autocomplete="off">
                <button type="submit"
                        class="gensx-send-button"
                        id="gensx-send-button"
                        ${state.isStreaming ? 'disabled' : ''}>
                  ${state.isStreaming ? '<div class="gensx-loading"></div>' : 'Send'}
                </button>
              </div>
            </form>
          </div>
        `;
      } else if (state.activeTab === 'details') {
        return `
          <div class="gensx-tab-content">
            <h3>Application Details</h3>
            <p>Application knowledge and working memory will be displayed here.</p>
          </div>
        `;
      } else if (state.activeTab === 'preferences') {
        return `
          <div class="gensx-tab-content">
            <h3>User Preferences</h3>
            <p>User preferences and settings will be displayed here.</p>
          </div>
        `;
      }
      return '';
    }

    function renderMessage(message: CopilotMessage, index: number): string {
      if (message.role === 'user') {
        const content = typeof message.content === 'string' ? message.content :
          Array.isArray(message.content) ? message.content.map(part =>
            typeof part === 'string' ? part : 'text' in part ? part.text : ''
          ).join('') : '';

        return `
          <div class="gensx-message user">
            <div class="gensx-message-content">${escapeHtml(content)}</div>
          </div>
        `;
      } else if (message.role === 'assistant') {
        const { textContent, toolCalls } = parseAssistantMessage(message);
        return `
          <div class="gensx-message assistant">
            <div class="gensx-message-content">
              ${textContent ? `<div>${escapeHtml(textContent)}</div>` : ''}
              ${toolCalls.length > 0 ? renderToolCalls(toolCalls) : ''}
            </div>
          </div>
        `;
      }
      return '';
    }

    function parseAssistantMessage(message: CopilotMessage): { textContent: string; toolCalls: ToolCall[] } {
      let textContent = '';
      const toolCalls: ToolCall[] = [];

      if (typeof message.content === 'string') {
        textContent = message.content;
      } else if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'text' || typeof part === 'string') {
            textContent += typeof part === 'string' ? part : part.text;
          } else if (part.type === 'tool-call') {
            // Find corresponding tool result
            const toolResult = state.messages.find(m =>
              m.role === 'tool' &&
              Array.isArray(m.content) &&
              m.content.find((c: any) => c.toolCallId === part.toolCallId)
            );

            toolCalls.push({
              id: part.toolCallId,
              toolCallId: part.toolCallId,
              name: part.toolName,
              toolName: part.toolName,
              arguments: part.args,
              args: part.args,
              result: toolResult ? (toolResult.content as any[]).find((c: any) => c.toolCallId === part.toolCallId)?.result : undefined
            });
          }
        }
      }

      return { textContent, toolCalls };
    }

    function renderToolCalls(toolCalls: ToolCall[]): string {
      return `
        <div class="gensx-tool-calls">
          ${toolCalls.map(call => `
            <div class="gensx-tool-call">
              <div class="gensx-tool-call-header" onclick="window.gensxCopilot.toggleTool('${call.toolCallId}')">
                <span>${call.toolName}</span>
                <svg style="transform: ${state.expandedTools.has(call.toolCallId) ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              ${state.expandedTools.has(call.toolCallId) ? `
                <div class="gensx-tool-call-content">
                  <div class="gensx-tool-call-section">
                    <div class="gensx-tool-call-label">Input:</div>
                    <pre class="gensx-tool-call-code">${JSON.stringify(call.args, null, 2)}</pre>
                  </div>
                  ${call.result !== undefined ? `
                    <div class="gensx-tool-call-section">
                      <div class="gensx-tool-call-label">Output:</div>
                      <pre class="gensx-tool-call-code">${JSON.stringify(call.result, null, 2)}</pre>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderInitHint(): string {
      if (state.messages.length === 0) {
        return `
          <div class="gensx-hint-bubble">
            <div class="gensx-hint-header">
              <svg class="gensx-hint-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
              </svg>
              <div class="gensx-hint-content">
                <h3>Get started with AI exploration</h3>
                <p>Try typing <code class="gensx-hint-code">/init</code> to have the AI systematically explore this application and discover its features automatically.</p>
                <div class="gensx-hint-actions">
                  <button class="gensx-hint-button primary" onclick="window.gensxCopilot.sendInitCommand()">Try /init now</button>
                  <button class="gensx-hint-button secondary" onclick="window.gensxCopilot.dismissHint()">Dismiss</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }

    function adjustMainContentMargin(): void {
      const mainContent = document.getElementById('main-content') || document.body;
      if (mainContent && state.isOpen) {
        (mainContent as HTMLElement).style.marginRight = `${state.paneWidth}%`;
      } else if (mainContent) {
        (mainContent as HTMLElement).style.marginRight = '0';
      }
    }

    function escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function scrollToBottom(): void {
      const messagesContainer = document.getElementById('gensx-messages');
      if (messagesContainer) {
        setTimeout(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 0);
      }
    }

    // Define streaming message handlers now that state, render, and scrollToBottom are available
    handleStreamingUpdate = (message: WorkflowStreamUpdateMessage) => {
      const { requestId, data } = message;
      console.log('Received streaming update:', requestId, data.text.length);
      
      // Only process if this matches our current streaming request
      if (currentStreamingRequestId === requestId) {
        // Update or create the assistant message
        if (currentStreamingMessageIndex >= 0 && state.messages[currentStreamingMessageIndex]) {
          // Update existing streaming message
          state.messages[currentStreamingMessageIndex].content = data.text;
        } else {
          // Create new assistant message for streaming
          const assistantMessage: CopilotMessage = {
            role: 'assistant',
            content: data.text
          };
          state.messages.push(assistantMessage);
          currentStreamingMessageIndex = state.messages.length - 1;
        }
        
        // Re-render to show updated content
        render();
        scrollToBottom();
      }
    };

    handleStreamingComplete = (message: WorkflowStreamCompleteMessage) => {
      const { requestId, data } = message;
      console.log('Streaming completed:', requestId);
      
      // Only process if this matches our current streaming request
      if (currentStreamingRequestId === requestId) {
        // Finalize the message content
        if (currentStreamingMessageIndex >= 0 && state.messages[currentStreamingMessageIndex]) {
          state.messages[currentStreamingMessageIndex].content = data.finalMessage;
        }
        
        // Reset streaming state
        state.isStreaming = false;
        currentStreamingRequestId = null;
        currentStreamingMessageIndex = -1;
        
        // Final render
        render();
        scrollToBottom();
      }
    };

    handleWorkflowError = (message: any) => {
      const { requestId, error } = message;
      console.log('Workflow error:', requestId, error);
      
      // Only process if this matches our current streaming request
      if (currentStreamingRequestId === requestId) {
        // Add error message
        state.messages.push({
          role: 'assistant',
          content: `Error: ${error}. Make sure the GenSX workflow server is running.`
        });
        
        // Reset streaming state
        state.isStreaming = false;
        currentStreamingRequestId = null;
        currentStreamingMessageIndex = -1;
        
        // Render error
        render();
        scrollToBottom();
      }
    };

    // Global API
    const localCopilotAPI: CopilotAPI = {
      togglePane() {
        state.isOpen = !state.isOpen;
        render();
        if (state.isOpen) {
          // Focus on input when opening
          setTimeout(() => {
            const input = document.getElementById('gensx-input') as HTMLInputElement;
            if (input) input.focus();
          }, 0);
        }
      },

      setActiveTab(tab: 'chat' | 'tools' | 'history' | 'details' | 'preferences') {
        state.activeTab = tab;
        render();
      },

      clearThread() {
        state.threadId = generateThreadId();
        localStorage.setItem('gensx-copilot-thread-id', state.threadId);
        state.messages = [];
        render();
      },

      toggleTool(toolCallId: string) {
        if (state.expandedTools.has(toolCallId)) {
          state.expandedTools.delete(toolCallId);
        } else {
          state.expandedTools.add(toolCallId);
        }
        render();
      },

      startResize(event: MouseEvent) {
        state.isResizing = true;
        event.preventDefault();

        const handleMouseMove = (e: MouseEvent) => {
          if (!state.isResizing) return;
          const newWidth = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
          state.paneWidth = Math.min(Math.max(newWidth, 20), 80);
          render();
        };

        const handleMouseUp = () => {
          state.isResizing = false;
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      },

      sendInitCommand() {
        this.sendMessageText('/init');
      },

      dismissHint() {
        // Add a placeholder message to hide the hint
        state.messages.push({ role: 'system', content: 'hint_dismissed' });
        render();
      },

      sendMessage(event: Event) {
        event.preventDefault();
        const input = document.getElementById('gensx-input') as HTMLInputElement;
        if (!input || !input.value.trim() || state.isStreaming) return;

        this.sendMessageText(input.value);
        input.value = '';
      },

      async sendMessageText(text: string) {
        if (state.isStreaming) return;

        // Add user message
        state.messages.push({ role: 'user', content: text });
        state.isStreaming = true;
        render();
        scrollToBottom();

        try {
          // Get current settings for user context
          const currentSettings = await SettingsManager.get();
          
          // Generate unique request ID and set up streaming state
          const requestId = 'req_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          currentStreamingRequestId = requestId;
          currentStreamingMessageIndex = -1; // Will be set when first streaming update arrives
          
          console.log('Sending workflow request:', requestId);
          
          // Send workflow request to background script
          const workflowMessage: WorkflowMessage = {
            type: 'WORKFLOW_REQUEST',
            requestId,
            data: {
              prompt: text,
              threadId: state.threadId,
              userId: state.userId,
              url: window.location.href,
              userName: currentSettings.userName,
              userContext: currentSettings.userContext
            }
          };

          // Send message to background worker (no response expected, streaming will come via separate messages)
          chrome.runtime.sendMessage(workflowMessage);

        } catch (error) {
          console.error('Error sending workflow request:', error);
          
          // Reset streaming state on error
          state.isStreaming = false;
          currentStreamingRequestId = null;
          currentStreamingMessageIndex = -1;
          
          state.messages.push({
            role: 'assistant',
            content: `Error: ${(error as Error).message}. Make sure the GenSX workflow server is running.`
          });
          
          render();
          scrollToBottom();
        }
      }
    };

    // Assign to global variables
    window.gensxCopilot = localCopilotAPI;

    // Make copilotAPI available to the message listener
    copilotAPI = localCopilotAPI;

    // Add keyboard shortcut support
    if (settings.enableShortcuts) {
      document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+G (Cmd+Shift+G on Mac) to toggle copilot
        if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.code === 'KeyG') {
          e.preventDefault();
          localCopilotAPI.togglePane();
        }
      });
    }

    // Initial render
    render();

    // Don't load chat history automatically - wait for user interaction

    console.log('GenSX Copilot initialization complete');
  }
})();
