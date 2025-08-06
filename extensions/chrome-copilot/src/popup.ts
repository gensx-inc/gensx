// Genie Popup Script - Full Chat Interface

import {
  CopilotMessage,
  ToolCall,
  ExtensionMessage,
  SettingsManager,
  WorkflowMessage,
  WorkflowStreamUpdateMessage,
  WorkflowStreamCompleteMessage,
  WorkflowMessagesUpdateMessage,
  WorkflowTodoListUpdateMessage, TodoList,
  TodoItem, TabContext
} from './types/copilot';

interface MentionState {
  isActive: boolean;
  position: { start: number; end: number };
  query: string;
  selectedIndex: number;
  filteredTabs: TabContext[];
}

interface PopupState {
  messages: CopilotMessage[];
  expandedTools: Set<string>;
  isStreaming: boolean;
  isReconnecting: boolean;
  userId: string;
  threadId: string;
  currentTabId?: number;
  currentUrl?: string;
  activeExecutionId?: string;
  activeRequestId?: string;
  activeTab: 'chat' | 'knowledge';
  websiteKnowledge: string;
  domain: string;
  knowledgeBaseLoaded: boolean;
  todoList: TodoList;
  mentionState: MentionState;
  availableTabs: TabContext[];
  selectedTabs: TabContext[];
  lastFailedMessage?: {
    text: string;
    selectedTabs: TabContext[];
    requestId: string;
  };
}

class PopupChatInterface {
  private state: PopupState;
  private elements: {
    messagesContainer: HTMLElement;
    messageInput: HTMLTextAreaElement;
    sendButton: HTMLButtonElement;
    inputForm: HTMLFormElement;
    clearButton: HTMLButtonElement;
    optionsButton: HTMLButtonElement;
    currentPageElement: HTMLElement;
    chatTab: HTMLElement;
    todoListContainer: HTMLElement;
    todoListHeader: HTMLElement;
    todoListToggle: HTMLButtonElement;
    todoListContent: HTMLElement;
    todoListItems: HTMLElement;
    todoListCount: HTMLElement;
    mentionDropdown: HTMLElement;
    mentionItems: HTMLElement;
    mentionLoading: HTMLElement;
    mentionEmpty: HTMLElement;
    selectedTabsContainer: HTMLElement;
    selectedTabsHeader: HTMLElement;
    selectedTabsToggle: HTMLButtonElement;
    selectedTabsContent: HTMLElement;
    selectedTabsList: HTMLElement;
  };
  private currentStreamingRequestId: string | null = null;
  private currentStreamingMessageIndex: number = -1;

  constructor() {
    this.state = {
      messages: [],
      expandedTools: new Set<string>(),
      isStreaming: false,
      isReconnecting: false,
      userId: this.generateUserId(),
      threadId: this.generateThreadId(),
      activeTab: 'chat',
      websiteKnowledge: '',
      domain: '',
      knowledgeBaseLoaded: false,
      todoList: { items: [] },
      mentionState: {
        isActive: false,
        position: { start: 0, end: 0 },
        query: '',
        selectedIndex: 0,
        filteredTabs: []
      },
      availableTabs: [],
      selectedTabs: [],
      lastFailedMessage: undefined,
    };

    // Get DOM elements
    this.elements = {
      messagesContainer: document.getElementById('messages')!,
      messageInput: document.getElementById('messageInput') as HTMLTextAreaElement,
      sendButton: document.getElementById('sendButton') as HTMLButtonElement,
      inputForm: document.getElementById('inputForm') as HTMLFormElement,
      clearButton: document.getElementById('clearThread') as HTMLButtonElement,
      optionsButton: document.getElementById('openOptions') as HTMLButtonElement,
      currentPageElement: document.getElementById('currentPage')!,
      chatTab: document.getElementById('chatTab')!,
      todoListContainer: document.getElementById('todoListContainer')!,
      todoListHeader: document.getElementById('todoListHeader')!,
      todoListToggle: document.getElementById('todoListToggle') as HTMLButtonElement,
      todoListContent: document.getElementById('todoListContent')!,
      todoListItems: document.getElementById('todoListItems')!,
      todoListCount: document.getElementById('todoListCount')!,
      mentionDropdown: document.getElementById('mentionDropdown')!,
      mentionItems: document.getElementById('mentionItems')!,
      mentionLoading: document.getElementById('mentionLoading')!,
      mentionEmpty: document.getElementById('mentionEmpty')!,
      selectedTabsContainer: document.getElementById('selectedTabsContainer')!,
      selectedTabsHeader: document.getElementById('selectedTabsHeader')!,
      selectedTabsToggle: document.getElementById('selectedTabsToggle') as HTMLButtonElement,
      selectedTabsContent: document.getElementById('selectedTabsContent')!,
      selectedTabsList: document.getElementById('selectedTabsList')!,
    };

    this.initializeEventListeners();
    this.loadPersistedState();
    this.updateCurrentPageInfo();
    this.renderTodoList(); // Initial render of todo list
    this.initializeMentions(); // Initialize @ mention functionality
    this.autoResizeTextarea(); // Set initial textarea height
    
    // Auto-focus the input field when popup opens
    setTimeout(() => {
      this.elements.messageInput.focus();
    }, 100); // Small delay to ensure DOM is ready
  }

  private generateUserId(): string {
    return 'popup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateThreadId(): string {
    return 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private initializeEventListeners(): void {
    // Form submission
    this.elements.inputForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.sendMessage();
    });

    // Auto-resize textarea and handle @ mentions
    this.elements.messageInput.addEventListener('input', (e) => {
      this.autoResizeTextarea();
      this.handleMentionInput(e);
    });

    // Enter to send (Shift+Enter for new line) and handle mention navigation
    this.elements.messageInput.addEventListener('keydown', (e) => {
      if (this.handleMentionKeydown(e)) {
        return; // Mention handler consumed the event
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Clear thread button
    this.elements.clearButton.addEventListener('click', async () => {
      await this.clearThread();
    });

    // Options button
    this.elements.optionsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });

    // Selected tabs toggle
    this.elements.selectedTabsToggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.toggleSelectedTabs();
    });

    // Allow clicking header to toggle as well
    this.elements.selectedTabsHeader.addEventListener('click', () => {
      this.toggleSelectedTabs();
    });

    // Todo list toggle
    this.elements.todoListToggle.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      this.toggleTodoList();
    });
    // Allow clicking header to toggle as well
    this.elements.todoListHeader.addEventListener('click', () => {
      this.toggleTodoList();
    });

    // Message listener for background script responses
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      this.handleBackgroundMessage(message);
    });
  }

  private autoResizeTextarea(): void {
    const textarea = this.elements.messageInput;
    const minHeight = 36; // Minimum height from CSS
    const maxHeight = 120; // Increased max height for better UX
    const lineHeight = 20; // Approximate line height

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';

    // For empty textarea (new threads), use a multi-line height to make it more prominent
    const effectiveMinHeight = textarea.value.trim() === '' ? 80 : minHeight;

    // Calculate desired height based on content
    let newHeight = Math.max(effectiveMinHeight, textarea.scrollHeight);

    // Limit to maxHeight
    newHeight = Math.min(newHeight, maxHeight);

    // Apply the new height
    textarea.style.height = newHeight + 'px';

    // Enable/disable scrolling based on content overflow
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.overflowY = 'hidden';
    }

  }


  private async loadPersistedState(): Promise<void> {
    try {
      // Load user and thread state from chrome.storage.local
      const stored = await chrome.storage.local.get(['userState', 'activeExecution']);

      // Load or create user/thread identifiers
      if (stored.userState) {
        this.state.userId = stored.userState.userId || this.state.userId;
        this.state.threadId = stored.userState.threadId || this.state.threadId;
      }

      // Save user state if it was just created
      await this.persistUserState();

      // Load thread history
      await this.loadThreadHistory();

      // Check for active execution and reconnect if needed
      if (stored.activeExecution && stored.activeExecution.executionId) {
        this.state.activeExecutionId = stored.activeExecution.executionId;
        this.state.activeRequestId = stored.activeExecution.requestId;

        console.log('Found active execution, attempting to reconnect:', this.state.activeExecutionId);
        await this.reconnectToExecution();
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }

  private async loadThreadHistory(): Promise<void> {
    try {
      console.log('Loading thread history for userId:', this.state.userId, 'threadId:', this.state.threadId);

      // Request thread history from background script (which will use blob API)
      const response = await chrome.runtime.sendMessage({
        type: 'GET_THREAD_HISTORY',
        data: {
          userId: this.state.userId,
          threadId: this.state.threadId
        }
      });

      console.log('Thread history response:', response);

      if (response && response.success && response.messages) {
        // Only load non-system messages for UI display
        this.state.messages = response.messages.filter((msg: any) => msg.role !== 'system');

        // Load todo list if present
        if (response.todoList && response.todoList.items) {
          this.state.todoList = response.todoList;
          console.log('Loaded todo list:', this.state.todoList.items.length, 'items');
        }

        console.log('Loaded thread history:', this.state.messages.length, 'messages');
        this.render(); // Re-render to show loaded messages and todo list
      } else if (response && !response.success) {
        console.warn('Failed to load thread history:', response.error);
      } else {
        console.log('No existing thread history found for thread:', this.state.threadId);
      }
    } catch (error) {
      console.warn('Failed to load thread history:', error);
    }
  }

  private async persistUserState(): Promise<void> {
    try {
      await chrome.storage.local.set({
        userState: {
          userId: this.state.userId,
          threadId: this.state.threadId,
        }
      });
    } catch (error) {
      console.warn('Failed to persist user state:', error);
    }
  }

  private async persistState(): Promise<void> {
    try {
      // Only persist execution state - thread history is managed by workflow
      if (this.state.activeExecutionId && this.state.activeRequestId) {
        await chrome.storage.local.set({
          activeExecution: {
            executionId: this.state.activeExecutionId,
            requestId: this.state.activeRequestId,
          }
        });
      } else {
        // Clear execution state if no active execution
        await chrome.storage.local.remove(['activeExecution']);
      }
    } catch (error) {
      console.warn('Failed to persist state:', error);
    }
  }

  private async reconnectToExecution(): Promise<void> {
    if (!this.state.activeExecutionId || !this.state.activeRequestId) {
      return;
    }

    try {
      console.log('Reconnecting to execution:', this.state.activeExecutionId);

      // Set reconnection state to show we're reconnecting
      this.state.isReconnecting = true;
      this.state.isStreaming = true;
      this.render();

      // Set a timeout to clear reconnection state if it takes too long
      const reconnectionTimeout = setTimeout(() => {
        console.warn('Reconnection timeout - clearing execution state');
        this.clearExecutionState();
        this.render();
      }, 10000); // 10 second timeout

      // Store timeout so we can clear it if reconnection succeeds
      (this as any).reconnectionTimeout = reconnectionTimeout;

      // Set the current streaming request ID so we can receive updates
      this.currentStreamingRequestId = this.state.activeRequestId;
      this.currentStreamingMessageIndex = -1;

      // Send reconnection request to background script
      chrome.runtime.sendMessage({
        type: 'WORKFLOW_RECONNECT',
        requestId: this.state.activeRequestId,
        data: {
          executionId: this.state.activeExecutionId,
        }
      });

    } catch (error) {
      console.error('Failed to reconnect to execution:', error);
      // Clear the execution state if reconnection fails
      this.clearExecutionState();
    }
  }

  private clearExecutionState(): void {
    this.state.activeExecutionId = undefined;
    this.state.activeRequestId = undefined;
    this.state.isStreaming = false;
    this.state.isReconnecting = false;

    // Clear reconnection timeout if it exists
    if ((this as any).reconnectionTimeout) {
      clearTimeout((this as any).reconnectionTimeout);
      (this as any).reconnectionTimeout = null;
    }

    // Clear only execution state, not thread messages
    chrome.storage.local.remove(['activeExecution']).catch(error => {
      console.warn('Failed to clear execution state:', error);
    });
  }

  private async updateCurrentPageInfo(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && tab.url) {
        this.state.currentTabId = tab.id;
        this.state.currentUrl = tab.url;

        const domain = new URL(tab.url).hostname;
        this.state.domain = domain;
        this.elements.currentPageElement.textContent = domain;

            // Load website knowledge when page info updates - removed since method was deleted
    // await this.loadWebsiteKnowledge();
      } else {
        this.elements.currentPageElement.textContent = 'No active page';
        this.state.domain = '';
      }
    } catch (error) {
      console.warn('Failed to get current page info:', error);
      this.elements.currentPageElement.textContent = 'Unknown page';
      this.state.domain = '';
    }

    // Render after all initialization is complete
    this.render();
  }

  // Knowledge-related methods removed since knowledge tab doesn't exist in current HTML

  private handleBackgroundMessage(message: ExtensionMessage): void {
    switch (message.type) {
      case 'WORKFLOW_EXECUTION_STARTED':
        this.handleExecutionStarted(message);
        break;
      case 'WORKFLOW_STREAM_UPDATE':
        this.handleStreamingUpdate(message as WorkflowStreamUpdateMessage);
        break;
      case 'WORKFLOW_MESSAGES_UPDATE':
        this.handleMessagesUpdate(message as WorkflowMessagesUpdateMessage);
        break;
      case 'WORKFLOW_TODO_LIST_UPDATE':
        this.handleTodoListUpdate(message as WorkflowTodoListUpdateMessage);
        break;
      case 'WORKFLOW_STREAM_COMPLETE':
        this.handleStreamingComplete(message as WorkflowStreamCompleteMessage);
        break;
      case 'WORKFLOW_ERROR':
        this.handleWorkflowError(message);
        break;
      case 'TAB_OPENED_ADD_TO_SELECTED':
        this.handleTabOpenedAddToSelected(message);
        break;
    }
  }

  private handleExecutionStarted(message: any): void {
    const { requestId, data } = message;

    if (this.currentStreamingRequestId === requestId) {
      this.state.activeExecutionId = data.executionId;
      console.log('Workflow execution started:', data.executionId);
      this.persistState();
    }
  }

  private handleStreamingUpdate(message: WorkflowStreamUpdateMessage): void {
    const { requestId, data } = message;

    if (this.currentStreamingRequestId === requestId) {
      // Clear reconnection state since we're now receiving updates
      this.state.isReconnecting = false;

      // Clear reconnection timeout if it exists
      if ((this as any).reconnectionTimeout) {
        clearTimeout((this as any).reconnectionTimeout);
        (this as any).reconnectionTimeout = null;
      }

      // Update or create the assistant message
      if (this.currentStreamingMessageIndex >= 0 && this.state.messages[this.currentStreamingMessageIndex]) {
        this.state.messages[this.currentStreamingMessageIndex].content = data.text;
      } else {
        const assistantMessage: CopilotMessage = {
          role: 'assistant',
          content: data.text
        };
        this.state.messages.push(assistantMessage);
        this.currentStreamingMessageIndex = this.state.messages.length - 1;
      }

      this.render();
      this.scrollToBottom(); // Smart scroll during streaming updates
    }
  }

  private handleMessagesUpdate(message: WorkflowMessagesUpdateMessage): void {
    const { requestId, data } = message;

    if (this.currentStreamingRequestId === requestId) {
      // Clear reconnection state since we're now receiving updates
      this.state.isReconnecting = false;

      // Clear reconnection timeout if it exists
      if ((this as any).reconnectionTimeout) {
        clearTimeout((this as any).reconnectionTimeout);
        (this as any).reconnectionTimeout = null;
      }

      this.state.messages = data.messages;
      this.render();
      this.scrollToBottom(); // Smart scroll during streaming updates
    }
  }

  private handleTodoListUpdate(message: WorkflowTodoListUpdateMessage): void {
    const { requestId, data } = message;

    if (this.currentStreamingRequestId === requestId) {
      // Clear reconnection state since we're now receiving updates
      this.state.isReconnecting = false;

      // Clear reconnection timeout if it exists
      if ((this as any).reconnectionTimeout) {
        clearTimeout((this as any).reconnectionTimeout);
        (this as any).reconnectionTimeout = null;
      }

      this.state.todoList = data.todoList;
      this.renderTodoList();
    }
  }

  private handleStreamingComplete(message: WorkflowStreamCompleteMessage): void {
    const { requestId, data } = message;

    if (this.currentStreamingRequestId === requestId) {
      if (this.currentStreamingMessageIndex >= 0 && this.state.messages[this.currentStreamingMessageIndex]) {
        this.state.messages[this.currentStreamingMessageIndex].content = data.finalMessage;
      }

      this.state.isStreaming = false;
      this.currentStreamingRequestId = null;
      this.currentStreamingMessageIndex = -1;

      // Clear preserved message state
      this.state.lastFailedMessage = undefined;

      // Clear execution state when workflow completes
      this.clearExecutionState();

      this.render();
      this.scrollToBottom(); // Smart scroll - only if user is at bottom
      this.persistState();
      
      // Auto-focus input field when streaming completes
      setTimeout(() => {
        this.elements.messageInput.focus();
      }, 100);
    }
  }

  private handleWorkflowError(message: any): void {
    const { requestId, error } = message;

    if (this.currentStreamingRequestId === requestId) {
      // Find and restore the failed message
      if (this.state.lastFailedMessage && this.state.lastFailedMessage.requestId === requestId) {
        // Remove the user message from chat history (last message should be the user message)
        if (this.state.messages.length > 0 && this.state.messages[this.state.messages.length - 1].role === 'user') {
          this.state.messages.pop();
        }

        // Extract clean error message
        const cleanError = this.extractCleanErrorMessage(error);
        
        // Add error message to chat history to inform the user
        this.state.messages.push({
          role: 'system',
          content: `⚠️ ${cleanError}\n\nYour message has been restored to the input field below for editing.`
        });

        // Restore the message to input field and selected tabs
        this.elements.messageInput.value = this.state.lastFailedMessage.text;
        this.state.selectedTabs = [...this.state.lastFailedMessage.selectedTabs];
        this.autoResizeTextarea();

        // Clear failed message state
        this.state.lastFailedMessage = undefined;

        console.log(`Workflow error: ${error}. Message restored to input field for editing.`);
      } else {
        console.warn('No preserved message found for failed request:', requestId);
        
        // Extract clean error message
        const cleanError = this.extractCleanErrorMessage(error);
        
        // Still show error message even if we couldn't restore the user message
        this.state.messages.push({
          role: 'system',
          content: `⚠️ ${cleanError}`
        });
      }

      this.state.isStreaming = false;
      this.currentStreamingRequestId = null;
      this.currentStreamingMessageIndex = -1;

      // Clear execution state on error
      this.clearExecutionState();

      this.render();
      this.forceScrollToBottom(); // Force scroll to show error message
      this.persistState();
      
      // Auto-focus input field after error for immediate editing
      setTimeout(() => {
        this.elements.messageInput.focus();
      }, 100);
    }
  }

  private async sendMessage(): Promise<void> {
    const text = this.elements.messageInput.value.trim();
    if (!text || this.state.isStreaming) return;

    // Use currently selected tabs
    const mentionedTabs = [...this.state.selectedTabs]; // Copy to preserve state

    // Clear any previous system error messages before sending new message
    this.state.messages = this.state.messages.filter(msg => msg.role !== 'system');

    // Add user message
    this.state.messages.push({ role: 'user', content: text });
    this.state.isStreaming = true;
    this.elements.messageInput.value = '';
    this.autoResizeTextarea();

    // Auto-collapse selected tabs area after sending message
    this.collapseSelectedTabs();

    this.render();
    this.forceScrollToBottom(); // Force scroll when user sends message

    try {
      const settings = await SettingsManager.get();

      // Generate unique request ID
      const requestId = 'popup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.currentStreamingRequestId = requestId;
      this.currentStreamingMessageIndex = -1;

      // Store request ID for potential reconnection
      this.state.activeRequestId = requestId;

      // Preserve message details for retry in case of error
      this.state.lastFailedMessage = {
        text,
        selectedTabs: mentionedTabs,
        requestId
      };

      const workflowMessage: WorkflowMessage = {
        type: 'WORKFLOW_REQUEST',
        requestId,
        data: {
          prompt: text,
          threadId: this.state.threadId,
          userId: this.state.userId,
          userName: settings.userName,
          userContext: settings.userContext,
          selectedTabs: mentionedTabs,
          conversationMode: mentionedTabs.length === 0 ? 'general' :
                           mentionedTabs.length === 1 ? 'single-tab' : 'multi-tab'
        }
      };

      // Send to background script
      chrome.runtime.sendMessage(workflowMessage);

    } catch (error) {
      console.error('Error sending message:', error);

      this.state.isStreaming = false;
      this.currentStreamingRequestId = null;

      // Show generic error message in chat
      this.state.messages.push({
        role: 'assistant',
        content: `Error: ${(error as Error).message}. Make sure the GenSX workflow server is running.`
      });

      this.render();
      this.scrollToBottom();
    }
  }

  private extractCleanErrorMessage(error: any): string {
    if (!error) {
      return 'Workflow execution failed';
    }

    let errorMessage = '';

    // Handle different error formats
    if (typeof error === 'string') {
      // Check if it's a JSON-serialized error object
      if (error.startsWith('{') && error.includes('"message"')) {
        try {
          const errorObj = JSON.parse(error);
          errorMessage = errorObj.message || errorObj.error || error;
        } catch (parseError) {
          errorMessage = error;
        }
      } else {
        errorMessage = error;
      }
    } else if (typeof error === 'object') {
      // Handle error objects directly
      errorMessage = error.message || error.error || String(error);
    } else {
      errorMessage = String(error);
    }

    // Remove common technical prefixes
    let cleanError = errorMessage
      .replace(/^Error:\s*/i, '')
      .replace(/^Workflow execution failed:\s*/i, '')
      .replace(/^GenSX error:\s*/i, '')
      .replace(/^Runtime error:\s*/i, '')
      .trim();

    // If the error is empty after cleaning, use generic message
    if (!cleanError) {
      return 'Workflow execution failed';
    }

    // Capitalize first letter if it's not already
    cleanError = cleanError.charAt(0).toUpperCase() + cleanError.slice(1);

    return cleanError;
  }

  private async clearThread(): Promise<void> {
    // Generate new thread ID
    this.state.threadId = this.generateThreadId();
    this.state.messages = [];
    this.state.todoList = { items: [] }; // Clear todo list state
    this.state.selectedTabs = []; // Clear selected tabs
    this.state.lastFailedMessage = undefined; // Clear failed message

    // Clear any active execution
    this.clearExecutionState();

    // Reset input and auto-select active tab
    this.elements.messageInput.value = '';
    this.autoResizeTextarea(); // Reset textarea height
    await this.autoSelectActiveTab();

    // Persist new thread ID
    await this.persistUserState();

    // Re-render with empty messages and todo list
    this.render();
    
    // Auto-focus input field after clearing thread
    setTimeout(() => {
      this.elements.messageInput.focus();
    }, 100);

    console.log('Started new thread:', this.state.threadId);
  }

  private toggleTool(toolCallId: string): void {
    if (this.state.expandedTools.has(toolCallId)) {
      this.state.expandedTools.delete(toolCallId);
    } else {
      this.state.expandedTools.add(toolCallId);
    }
    this.render();
  }

  private render(): void {
    this.elements.messagesContainer.innerHTML = '';

    // Render messages
    this.state.messages.forEach((message, index) => {
      if (message.role === 'system' && message.content === 'hint_dismissed') {
        return; // Skip system messages
      }

      const messageElement = this.renderMessage(message, index);
      this.elements.messagesContainer.appendChild(messageElement);
    });

    // Render hint if no messages and knowledge base is empty
    if (this.state.messages.length === 0 && this.shouldShowInitHint()) {
      const hintElement = this.renderInitHint();
      this.elements.messagesContainer.appendChild(hintElement);
    }

    // Show reconnection status if reconnecting
    if (this.state.isReconnecting) {
      const reconnectElement = this.renderReconnectionStatus();
      this.elements.messagesContainer.appendChild(reconnectElement);
    }


    // Update todo list
    this.renderTodoList();

    // Update selected tabs display
    this.renderSelectedTabs();

    // Auto-expand selected tabs section for new threads (when there are no messages and tabs are selected)
    if (this.state.messages.length === 0 && this.state.selectedTabs.length > 0) {
      // Ensure the selected tabs section is expanded for new threads
      this.elements.selectedTabsContainer.classList.remove('collapsed');
    }

    // Update header with selected tabs info
    this.updateHeaderAndPlaceholder();

    // Update UI state
    this.elements.messageInput.disabled = this.state.isStreaming;
    this.elements.sendButton.disabled = this.state.isStreaming;

    if (this.state.isReconnecting) {
      this.elements.sendButton.innerHTML = '<div class="loading"></div> Reconnecting...';
    } else if (this.state.isStreaming) {
      this.elements.sendButton.innerHTML = '<div class="loading"></div>';
    } else {
      this.elements.sendButton.innerHTML = 'Send';
    }
  }

  private renderMessage(message: CopilotMessage, index: number): HTMLElement {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (message.role === 'user') {
      const content = typeof message.content === 'string' ? message.content :
        Array.isArray(message.content) ? message.content.map(part =>
          typeof part === 'string' ? part : 'text' in part ? part.text : ''
        ).join('') : '';

      contentDiv.textContent = content;
    } else if (message.role === 'system') {
      const content = typeof message.content === 'string' ? message.content : String(message.content);
      
      // Split by \n and render as separate lines
      const lines = content.split('\n');
      lines.forEach((line, lineIndex) => {
        const lineDiv = document.createElement('div');
        lineDiv.textContent = line;
        if (lineIndex > 0) {
          lineDiv.style.marginTop = '4px';
        }
        contentDiv.appendChild(lineDiv);
      });
    } else if (message.role === 'assistant') {
      const { textContent, toolCalls } = this.parseAssistantMessage(message);

      if (textContent) {
        const textDiv = document.createElement('div');
        textDiv.textContent = textContent;
        contentDiv.appendChild(textDiv);
      }

      if (toolCalls.length > 0) {
        const toolCallsElement = this.renderToolCalls(toolCalls);
        contentDiv.appendChild(toolCallsElement);
      }
    }

    messageDiv.appendChild(contentDiv);
    return messageDiv;
  }

  private parseAssistantMessage(message: CopilotMessage): { textContent: string; toolCalls: ToolCall[] } {
    let textContent = '';
    const toolCalls: ToolCall[] = [];

    if (typeof message.content === 'string') {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text' || typeof part === 'string') {
          textContent += typeof part === 'string' ? part : part.text;
        } else if (part.type === 'tool-call') {
          const toolResult = this.state.messages.find(m =>
            m.role === 'tool' &&
            Array.isArray(m.content) &&
            m.content.find((c: any) => c.type === 'tool-result' && c.toolCallId === part.toolCallId)
          );

          const resultContent = toolResult ?
            (toolResult.content as any[]).find((c: any) => c.type === 'tool-result' && c.toolCallId === part.toolCallId)?.result :
            undefined;

          toolCalls.push({
            id: part.toolCallId,
            toolCallId: part.toolCallId,
            name: part.toolName,
            toolName: part.toolName,
            arguments: part.args,
            args: part.args,
            result: resultContent
          });
        }
      }
    }

    // Also check if message has toolCalls property
    if (message.toolCalls) {
      for (const toolCall of message.toolCalls) {
        if (!toolCalls.find(tc => tc.toolCallId === toolCall.toolCallId)) {
          toolCalls.push(toolCall);
        }
      }
    }

    return { textContent, toolCalls };
  }

  private renderToolCalls(toolCalls: ToolCall[]): HTMLElement {
    const toolCallsDiv = document.createElement('div');
    toolCallsDiv.className = 'tool-calls';

    toolCalls.forEach(call => {
      const toolCallDiv = document.createElement('div');
      toolCallDiv.className = 'tool-call';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'tool-call-header';
      headerDiv.innerHTML = `
        <span>${call.toolName}</span>
        <svg style="transform: ${this.state.expandedTools.has(call.toolCallId) ? 'rotate(180deg)' : 'rotate(0deg)'}; transition: transform 0.2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      `;

      headerDiv.addEventListener('click', () => {
        this.toggleTool(call.toolCallId);
      });

      toolCallDiv.appendChild(headerDiv);

      if (this.state.expandedTools.has(call.toolCallId)) {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'tool-call-content';

        const inputSection = document.createElement('div');
        inputSection.className = 'tool-call-section';

        const inputLabel = document.createElement('div');
        inputLabel.className = 'tool-call-label';
        inputLabel.textContent = 'Input:';

        const inputCode = document.createElement('pre');
        inputCode.className = 'tool-call-code';
        inputCode.textContent = JSON.stringify(call.args, null, 2);

        inputSection.appendChild(inputLabel);
        inputSection.appendChild(inputCode);
        contentDiv.appendChild(inputSection);

        if (call.result !== undefined) {
          const outputSection = document.createElement('div');
          outputSection.className = 'tool-call-section';

          const outputLabel = document.createElement('div');
          outputLabel.className = 'tool-call-label';
          outputLabel.textContent = 'Output:';

          const outputCode = document.createElement('pre');
          outputCode.className = 'tool-call-code';
          outputCode.textContent = JSON.stringify(call.result, null, 2);

          outputSection.appendChild(outputLabel);
          outputSection.appendChild(outputCode);
          contentDiv.appendChild(outputSection);
        }

        toolCallDiv.appendChild(contentDiv);
      }

      toolCallsDiv.appendChild(toolCallDiv);
    });

    return toolCallsDiv;
  }

  private renderInitHint(): HTMLElement {
    const hintDiv = document.createElement('div');
    hintDiv.className = 'hint-bubble';
    hintDiv.innerHTML = `
      <div class="hint-content">
        <h4>Get started with AI exploration</h4>
        <p>Try typing <code class="hint-code">/init</code> to have the AI systematically explore the current page and discover its features automatically.</p>
        <div class="hint-actions">
          <button class="hint-button primary" id="tryInit">Try /init now</button>
          <button class="hint-button secondary" id="dismissHint">Dismiss</button>
        </div>
      </div>
    `;

    const tryInitButton = hintDiv.querySelector('#tryInit') as HTMLButtonElement;
    const dismissButton = hintDiv.querySelector('#dismissHint') as HTMLButtonElement;

    tryInitButton.addEventListener('click', () => {
      this.elements.messageInput.value = '/init';
      this.sendMessage();
    });

    dismissButton.addEventListener('click', () => {
      this.state.messages.push({ role: 'system', content: 'hint_dismissed' });
      this.render();
    });

    return hintDiv;
  }

  private shouldShowInitHint(): boolean {
    // Only show init hint if knowledge base is loaded and empty
    return this.state.knowledgeBaseLoaded && (!this.state.websiteKnowledge || this.state.websiteKnowledge.trim().length === 0);
  }

  private renderReconnectionStatus(): HTMLElement {
    const statusDiv = document.createElement('div');
    statusDiv.className = 'reconnection-status';
    statusDiv.innerHTML = `
      <div class="reconnection-content">
        <div class="loading"></div>
        <span>Reconnecting to workflow execution...</span>
      </div>
    `;
    return statusDiv;
  }


  private renderTodoList(): void {
    const { todoList } = this.state;
    const { todoListContainer, todoListItems, todoListCount } = this.elements;

    // Update count with completed/total format
    const totalItems = todoList.items.length;
    const completedItems = todoList.items.filter(item => item.completed).length;
    todoListCount.textContent = `${completedItems}/${totalItems}`;

    // Show/hide container based on whether there are items
    if (totalItems > 0) {
      todoListContainer.classList.add('has-items');
    } else {
      todoListContainer.classList.remove('has-items');
    }

    // Clear existing items
    todoListItems.innerHTML = '';

    if (totalItems === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'todo-list-empty';
      emptyDiv.textContent = 'No todo items yet';
      todoListItems.appendChild(emptyDiv);
      return;
    }

    // Render todo items
    todoList.items.forEach((item: TodoItem, index: number) => {
      const todoItemDiv = document.createElement('div');
      todoItemDiv.className = `todo-item ${item.completed ? 'completed' : ''}`;

      const checkboxDiv = document.createElement('div');
      checkboxDiv.className = `todo-checkbox ${item.completed ? 'checked' : ''}`;
      // Removed click event listener - checkboxes are display-only

      const titleDiv = document.createElement('div');
      titleDiv.className = 'todo-item-title';
      titleDiv.textContent = item.title;

      todoItemDiv.appendChild(checkboxDiv);
      todoItemDiv.appendChild(titleDiv);
      todoListItems.appendChild(todoItemDiv);
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      // Only auto-scroll if user is already at or near the bottom
      if (this.shouldAutoScroll()) {
        this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
      }
    }, 0);
  }

  private shouldAutoScroll(): boolean {
    const container = this.elements.messagesContainer;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Consider "at bottom" if within 100px of the bottom
    // This accounts for small variations and partial scrolling
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= 100;
  }

  private forceScrollToBottom(): void {
    setTimeout(() => {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }, 0);
  }

  // @ Mention functionality
  private async initializeMentions(): Promise<void> {
    try {
      // Load available tabs
      await this.loadAvailableTabs();

      // Auto-select active tab if accessible
      await this.autoSelectActiveTab();
    } catch (error) {
      console.warn('Failed to initialize mentions:', error);
    }
  }

  private async loadAvailableTabs(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      this.state.availableTabs = tabs
        .filter(tab => tab.id && tab.url && !this.isInaccessibleTab(tab.url))
        .map(tab => ({
          tabId: tab.id!,
          url: tab.url!,
          title: tab.title || new URL(tab.url!).hostname,
          domain: new URL(tab.url!).hostname,
          favicon: tab.favIconUrl,
          isActive: tab.active || false
        }));
    } catch (error) {
      console.warn('Failed to load tabs:', error);
      this.state.availableTabs = [];
    }
  }

  private isInaccessibleTab(url: string): boolean {
    return url.startsWith('chrome://') ||
           url.startsWith('chrome-extension://') ||
           url.startsWith('edge://') ||
           url.startsWith('about:') ||
           url === 'chrome://newtab/' ||
           url === 'about:blank';
  }

  private async autoSelectActiveTab(): Promise<void> {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab && activeTab.id && activeTab.url && !this.isInaccessibleTab(activeTab.url)) {
        const tabContext: TabContext = {
          tabId: activeTab.id,
          url: activeTab.url,
          title: activeTab.title || new URL(activeTab.url).hostname,
          domain: new URL(activeTab.url).hostname,
          favicon: activeTab.favIconUrl,
          isActive: true
        };

        this.state.selectedTabs = [tabContext];

        // Update UI after selecting tab
        this.render();
      }
    } catch (error) {
      console.warn('Failed to auto-select active tab:', error);
    }
  }

  private handleMentionInput(e: Event): void {
    const textarea = this.elements.messageInput;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart || 0;

    const mention = this.detectMention(text, cursorPos);

    if (mention) {
      this.state.mentionState = {
        isActive: true,
        position: mention.position,
        query: mention.query,
        selectedIndex: 0,
        filteredTabs: this.filterTabs(mention.query)
      };
      this.showMentionDropdown();
    } else {
      this.hideMentionDropdown();
    }
  }

  private detectMention(text: string, cursorPos: number): { position: { start: number; end: number }; query: string } | null {
    // Find the last @ symbol before the cursor
    let atPos = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (text[i] === '@') {
        atPos = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break; // Hit whitespace before @, no active mention
      }
    }

    if (atPos === -1) return null;

    // Find the end of the mention (next space or end of string)
    let endPos = cursorPos;
    for (let i = atPos + 1; i < text.length; i++) {
      if (text[i] === ' ' || text[i] === '\n' || text[i] === '@') {
        endPos = i;
        break;
      }
      endPos = i + 1;
    }

    // Only consider it an active mention if cursor is within the mention
    if (cursorPos < atPos || cursorPos > endPos) return null;

    const query = text.substring(atPos + 1, endPos);
    return {
      position: { start: atPos, end: endPos },
      query
    };
  }

  private filterTabs(query: string): TabContext[] {
    // Get IDs of already selected tabs to exclude them
    const selectedTabIds = new Set(this.state.selectedTabs.map(tab => tab.tabId));

    // Filter out already selected tabs first
    const availableUnselectedTabs = this.state.availableTabs
      .filter(tab => !selectedTabIds.has(tab.tabId));

    if (!query) return availableUnselectedTabs.slice(0, 10); // Show top 10 when no query

    const lowQuery = query.toLowerCase();
    return availableUnselectedTabs
      .filter(tab =>
        tab.domain.toLowerCase().includes(lowQuery) ||
        tab.title.toLowerCase().includes(lowQuery) ||
        tab.url.toLowerCase().includes(lowQuery)
      )
      .slice(0, 10); // Limit to 10 results
  }

  private handleMentionKeydown(e: KeyboardEvent): boolean {
    if (!this.state.mentionState.isActive) return false;

    const filteredTabs = this.state.mentionState.filteredTabs;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.state.mentionState.selectedIndex =
          (this.state.mentionState.selectedIndex + 1) % filteredTabs.length;
        this.renderMentionItems();
        this.scrollToSelectedMentionItem();
        return true;

      case 'ArrowUp':
        e.preventDefault();
        this.state.mentionState.selectedIndex =
          this.state.mentionState.selectedIndex === 0
            ? filteredTabs.length - 1
            : this.state.mentionState.selectedIndex - 1;
        this.renderMentionItems();
        this.scrollToSelectedMentionItem();
        return true;

      case 'Enter':
        e.preventDefault();
        if (filteredTabs[this.state.mentionState.selectedIndex]) {
          this.selectMention(filteredTabs[this.state.mentionState.selectedIndex]);
        }
        return true;

      case 'Escape':
        e.preventDefault();
        this.hideMentionDropdown();
        return true;

      case 'Backspace':
        // If we're at the start of a mention and backspace, remove it
        const textarea = this.elements.messageInput;
        const cursorPos = textarea.selectionStart || 0;
        if (cursorPos === this.state.mentionState.position.start + 1) {
          // Remove the entire @mention
          const text = textarea.value;
          const newText = text.substring(0, this.state.mentionState.position.start) +
                         text.substring(this.state.mentionState.position.end);
          textarea.value = newText;
          textarea.setSelectionRange(this.state.mentionState.position.start, this.state.mentionState.position.start);
          this.hideMentionDropdown();
          return true;
        }
        break;
    }

    return false;
  }

  private selectMention(tab: TabContext): void {
    const textarea = this.elements.messageInput;
    const text = textarea.value;
    const { start, end } = this.state.mentionState.position;

    // Remove the @mention from textarea
    const newText = text.substring(0, start) + text.substring(end);
    textarea.value = newText;
    textarea.setSelectionRange(start, start);

    // Add tab to selected tabs if not already there
    if (!this.state.selectedTabs.find(t => t.tabId === tab.tabId)) {
      this.state.selectedTabs.push(tab);
    }

    // Auto-resize textarea
    this.autoResizeTextarea();

    this.hideMentionDropdown();
    textarea.focus();

    // Re-render to show the new selected tab
    this.render();
  }

  private showMentionDropdown(): void {
    this.elements.mentionDropdown.style.display = 'block';
    this.renderMentionItems();
  }

  private hideMentionDropdown(): void {
    this.elements.mentionDropdown.style.display = 'none';
    this.state.mentionState.isActive = false;
  }

  private renderMentionItems(): void {
    const { filteredTabs, selectedIndex } = this.state.mentionState;
    const { mentionItems, mentionLoading, mentionEmpty } = this.elements;

    // Hide loading and empty states
    mentionLoading.style.display = 'none';
    mentionEmpty.style.display = 'none';

    if (filteredTabs.length === 0) {
      mentionEmpty.style.display = 'block';
      mentionItems.innerHTML = '';
      return;
    }

    mentionItems.innerHTML = '';

    filteredTabs.forEach((tab, index) => {
      const item = document.createElement('div');
      item.className = `mention-item ${index === selectedIndex ? 'selected' : ''}`;

      const favicon = document.createElement('div');
      favicon.className = 'mention-favicon';
      if (tab.favicon) {
        favicon.innerHTML = `<img src="${tab.favicon}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        favicon.textContent = tab.domain[0].toUpperCase();
      }

      const info = document.createElement('div');
      info.className = 'mention-info';

      const title = document.createElement('div');
      title.className = 'mention-title';
      title.textContent = tab.title;

      const domain = document.createElement('div');
      domain.className = 'mention-domain';
      domain.textContent = tab.domain;

      info.appendChild(title);
      info.appendChild(domain);

      if (tab.isActive) {
        const activeTag = document.createElement('div');
        activeTag.className = 'mention-tag';
        activeTag.textContent = 'Active';
        item.appendChild(activeTag);
      }

      item.appendChild(favicon);
      item.appendChild(info);

      item.addEventListener('click', () => {
        this.selectMention(tab);
      });

      mentionItems.appendChild(item);
    });
  }

  private parseMentionsFromText(text: string): TabContext[] {
    const mentionRegex = /@(\S+)/g;
    const mentions: TabContext[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      const domain = match[1];
      const tab = this.state.availableTabs.find(t => t.domain === domain);
      if (tab && !mentions.find(m => m.tabId === tab.tabId)) {
        mentions.push(tab);
      }
    }

    return mentions;
  }

  private updateHeaderAndPlaceholder(): void {
    const selectedCount = this.state.selectedTabs.length;

    if (selectedCount === 0) {
      // No tabs selected - general conversation mode
      this.elements.currentPageElement.textContent = 'General conversation';
      this.elements.messageInput.placeholder = 'Ask me anything...';
    } else if (selectedCount === 1) {
      // Single tab selected
      const tab = this.state.selectedTabs[0];
      const displayTitle = tab.title.length > 25 ? tab.title.substring(0, 22) + '...' : tab.title;
      this.elements.currentPageElement.textContent = displayTitle;
      this.elements.messageInput.placeholder = `Ask me about "${tab.title}"`;
    } else {
      // Multiple tabs selected
      this.elements.currentPageElement.textContent = `${selectedCount} tabs selected`;
      this.elements.messageInput.placeholder = `Ask me about these ${selectedCount} tabs`;
    }
  }

  private scrollToSelectedMentionItem(): void {
    const selectedIndex = this.state.mentionState.selectedIndex;
    const selectedItem = this.elements.mentionItems.children[selectedIndex] as HTMLElement;

    if (selectedItem) {
      selectedItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }

  private renderSelectedTabs(): void {
    const { selectedTabsContainer, selectedTabsList } = this.elements;
    const { selectedTabs } = this.state;

    if (selectedTabs.length === 0) {
      selectedTabsContainer.style.display = 'none';
      return;
    }

    selectedTabsContainer.style.display = 'block';
    selectedTabsList.innerHTML = '';

    selectedTabs.forEach((tab, index) => {
      const chip = document.createElement('div');
      chip.className = `selected-tab-chip ${tab.isActive ? 'selected-tab-active' : ''}`;

      // Favicon
      const favicon = document.createElement('div');
      favicon.className = 'selected-tab-favicon';
      if (tab.favicon) {
        favicon.innerHTML = `<img src="${tab.favicon}" alt="" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else {
        favicon.textContent = tab.domain[0].toUpperCase();
      }

      // Tab info
      const info = document.createElement('div');
      info.className = 'selected-tab-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'selected-tab-title';
      titleEl.textContent = tab.title;
      titleEl.title = `${tab.title} (${tab.domain})`; // Show full title and domain on hover

      const domainEl = document.createElement('div');
      domainEl.className = 'selected-tab-domain';
      domainEl.textContent = tab.domain;

      info.appendChild(titleEl);
      info.appendChild(domainEl);

      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button'; // Prevent form submission
      removeBtn.className = 'selected-tab-remove';
      removeBtn.innerHTML = '×';
      removeBtn.title = 'Remove tab';
      removeBtn.addEventListener('click', () => {
        this.removeSelectedTab(index);
      });

      chip.appendChild(favicon);
      chip.appendChild(info);
      chip.appendChild(removeBtn);

      selectedTabsList.appendChild(chip);
    });
  }

  private removeSelectedTab(index: number): void {
    this.state.selectedTabs.splice(index, 1);
    this.render(); // Re-render to update display
  }

  private toggleSelectedTabs(): void {
    const container = this.elements.selectedTabsContainer;
    const isCollapsed = container.classList.contains('collapsed');

    if (isCollapsed) {
      this.expandSelectedTabs();
    } else {
      this.collapseSelectedTabs();
    }
  }

  private collapseSelectedTabs(): void {
    const container = this.elements.selectedTabsContainer;
    container.classList.add('collapsed');
  }

  private expandSelectedTabs(): void {
    const container = this.elements.selectedTabsContainer;
    container.classList.remove('collapsed');
  }

  private toggleTodoList(): void {
    const container = this.elements.todoListContainer;
    const isCollapsed = container.classList.contains('collapsed');

    if (isCollapsed) {
      this.expandTodoList();
    } else {
      this.collapseTodoList();
    }
  }

  private collapseTodoList(): void {
    const container = this.elements.todoListContainer;
    container.classList.add('collapsed');
  }

  private expandTodoList(): void {
    const container = this.elements.todoListContainer;
    container.classList.remove('collapsed');
  }

  private handleTabOpenedAddToSelected(message: ExtensionMessage): void {
    if (!message.data) return;

    const { tabId, url, title, domain, favicon, isActive } = message.data;

    console.log('Adding newly opened tab to selected tabs:', { tabId, title, domain });

    // Create TabContext for the new tab
    const newTabContext: TabContext = {
      tabId: tabId,
      url: url,
      title: title,
      domain: domain,
      favicon: favicon,
      isActive: isActive || false
    };

    // Add to selected tabs if not already there
    const existingTabIndex = this.state.selectedTabs.findIndex(tab => tab.tabId === tabId);
    if (existingTabIndex === -1) {
      this.state.selectedTabs.push(newTabContext);
      console.log('New tab added to selected tabs, total:', this.state.selectedTabs.length);

      // Re-render to show the new tab
      this.render();

      // Persist the updated state
      this.persistState();

      // Show the selected tabs area if it was hidden
      if (this.elements.selectedTabsContainer.style.display === 'none') {
        this.elements.selectedTabsContainer.style.display = 'block';
      }
    } else {
      console.log('Tab already in selected tabs, updating info');
      // Update existing tab info in case title/domain changed
      this.state.selectedTabs[existingTabIndex] = newTabContext;
      this.render();
    }
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupChatInterface();
});
