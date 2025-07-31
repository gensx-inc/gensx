// GenSX Copilot Popup Script - Full Chat Interface

import { 
  CopilotMessage, 
  ToolCall, 
  ExtensionMessage, 
  SettingsManager, 
  WorkflowMessage, 
  WorkflowStreamUpdateMessage, 
  WorkflowStreamCompleteMessage, 
  WorkflowMessagesUpdateMessage,
  ExternalToolCallMessage,
  ExternalToolResponseMessage
} from './types/copilot';

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
    knowledgeTab: HTMLElement;
    knowledgeDomain: HTMLElement;
    knowledgeText: HTMLTextAreaElement;
    deleteKnowledgeButton: HTMLButtonElement;
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
      knowledgeTab: document.getElementById('knowledgeTab')!,
      knowledgeDomain: document.getElementById('knowledgeDomain')!,
      knowledgeText: document.getElementById('knowledgeText') as HTMLTextAreaElement,
      deleteKnowledgeButton: document.getElementById('deleteKnowledge') as HTMLButtonElement,
    };

    this.initializeEventListeners();
    this.loadPersistedState();
    this.updateCurrentPageInfo();
    this.updateBackgroundCurrentTab();
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

    // Auto-resize textarea
    this.elements.messageInput.addEventListener('input', () => {
      this.autoResizeTextarea();
    });

    // Enter to send (Shift+Enter for new line)
    this.elements.messageInput.addEventListener('keydown', (e) => {
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

    // Tab navigation
    document.querySelectorAll('.tab').forEach(tabButton => {
      tabButton.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).getAttribute('data-tab') as 'chat' | 'knowledge';
        this.switchTab(tab);
      });
    });

    // Delete knowledge button
    this.elements.deleteKnowledgeButton.addEventListener('click', () => {
      this.deleteWebsiteKnowledge();
    });

    // Message listener for background script responses
    chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
      this.handleBackgroundMessage(message);
    });
  }

  private autoResizeTextarea(): void {
    const textarea = this.elements.messageInput;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
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
        console.log('Loaded thread history:', this.state.messages.length, 'messages');
        this.render(); // Re-render to show loaded messages
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
        
        // Load website knowledge when page info updates
        await this.loadWebsiteKnowledge();
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

  private async updateBackgroundCurrentTab(): Promise<void> {
    try {
      // Tell the background script about the current tab ID
      await chrome.runtime.sendMessage({
        type: 'UPDATE_CURRENT_TAB'
      });
    } catch (error) {
      console.warn('Failed to update background current tab:', error);
    }
  }

  private async switchTab(tab: 'chat' | 'knowledge'): Promise<void> {
    this.state.activeTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tabButton => {
      tabButton.classList.remove('active');
      if (tabButton.getAttribute('data-tab') === tab) {
        tabButton.classList.add('active');
      }
    });
    
    // Update tab content
    this.elements.chatTab.classList.toggle('hidden', tab !== 'chat');
    this.elements.knowledgeTab.classList.toggle('hidden', tab !== 'knowledge');
    
    // If switching to knowledge tab, refetch and update the display
    if (tab === 'knowledge') {
      await this.loadWebsiteKnowledge();
      this.updateKnowledgeDisplay();
    }
  }

  private updateKnowledgeDisplay(): void {
    this.elements.knowledgeDomain.textContent = this.state.domain || 'No domain selected';
    this.elements.knowledgeText.value = this.state.websiteKnowledge;
    
    // Enable/disable delete button based on whether knowledge exists
    const hasKnowledge = this.state.websiteKnowledge.trim().length > 0;
    this.elements.deleteKnowledgeButton.disabled = !hasKnowledge;
  }

  private async loadWebsiteKnowledge(): Promise<void> {
    if (!this.state.domain) {
      this.state.knowledgeBaseLoaded = true;
      return;
    }

    try {
      console.log('Loading website knowledge for domain:', this.state.domain);
      
      const response = await chrome.runtime.sendMessage({
        type: 'GET_WEBSITE_KNOWLEDGE',
        data: {
          userId: this.state.userId,
          domain: this.state.domain
        }
      });
      
      console.log('Website knowledge response:', response);
      
      if (response && response.success) {
        this.state.websiteKnowledge = response.content || '';
        console.log('Loaded website knowledge:', this.state.websiteKnowledge.length, 'characters');
        
        // Update knowledge display if we're on the knowledge tab
        if (this.state.activeTab === 'knowledge') {
          this.updateKnowledgeDisplay();
        }
      } else if (response && !response.success) {
        console.warn('Failed to load website knowledge:', response.error);
        this.state.websiteKnowledge = '';
      } else {
        console.log('No website knowledge found for domain:', this.state.domain);
        this.state.websiteKnowledge = '';
      }
    } catch (error) {
      console.warn('Failed to load website knowledge:', error);
      this.state.websiteKnowledge = '';
    } finally {
      // Mark knowledge base as loaded regardless of success/failure
      this.state.knowledgeBaseLoaded = true;
      // Re-render to potentially show the init hint
      this.render();
    }
  }

  private async deleteWebsiteKnowledge(): Promise<void> {
    if (!this.state.domain) {
      return;
    }

    if (!confirm(`Are you sure you want to delete all website knowledge for ${this.state.domain}?`)) {
      return;
    }

    try {
      console.log('Deleting website knowledge for domain:', this.state.domain);
      
      const response = await chrome.runtime.sendMessage({
        type: 'DELETE_WEBSITE_KNOWLEDGE',
        data: {
          userId: this.state.userId,
          domain: this.state.domain
        }
      });
      
      console.log('Delete website knowledge response:', response);
      
      if (response && response.success) {
        this.state.websiteKnowledge = '';
        console.log('Successfully deleted website knowledge');
        alert(response.message || 'Website knowledge deleted successfully');
        this.updateKnowledgeDisplay();
      } else {
        console.error('Failed to delete website knowledge:', response?.message);
        alert('Failed to delete website knowledge: ' + (response?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete website knowledge:', error);
      alert('Failed to delete website knowledge: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

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
      case 'WORKFLOW_STREAM_COMPLETE':
        this.handleStreamingComplete(message as WorkflowStreamCompleteMessage);
        break;
      case 'WORKFLOW_ERROR':
        this.handleWorkflowError(message);
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
      this.scrollToBottom();
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
      this.scrollToBottom();
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
      
      // Clear execution state when workflow completes
      this.clearExecutionState();
      
      this.render();
      this.scrollToBottom();
      this.persistState();
    }
  }

  private handleWorkflowError(message: any): void {
    const { requestId, error } = message;
    
    if (this.currentStreamingRequestId === requestId) {
      this.state.messages.push({
        role: 'assistant',
        content: `Error: ${error}. Make sure the GenSX workflow server is running.`
      });
      
      this.state.isStreaming = false;
      this.currentStreamingRequestId = null;
      this.currentStreamingMessageIndex = -1;
      
      // Clear execution state on error
      this.clearExecutionState();
      
      this.render();
      this.scrollToBottom();
      this.persistState();
    }
  }

  private async sendMessage(): Promise<void> {
    const text = this.elements.messageInput.value.trim();
    if (!text || this.state.isStreaming) return;

    // Add user message
    this.state.messages.push({ role: 'user', content: text });
    this.state.isStreaming = true;
    this.elements.messageInput.value = '';
    this.autoResizeTextarea();
    
    this.render();
    this.scrollToBottom();

    try {
      const settings = await SettingsManager.get();
      
      // Generate unique request ID
      const requestId = 'popup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      this.currentStreamingRequestId = requestId;
      this.currentStreamingMessageIndex = -1;

      // Store request ID for potential reconnection
      this.state.activeRequestId = requestId;
      
      const workflowMessage: WorkflowMessage = {
        type: 'WORKFLOW_REQUEST',
        requestId,
        data: {
          prompt: text,
          threadId: this.state.threadId,
          userId: this.state.userId,
          url: this.state.currentUrl || '',
          userName: settings.userName,
          userContext: settings.userContext,
          tabId: this.state.currentTabId
        }
      };

      // Send to background script
      chrome.runtime.sendMessage(workflowMessage);

    } catch (error) {
      console.error('Error sending message:', error);
      
      this.state.isStreaming = false;
      this.currentStreamingRequestId = null;
      
      this.state.messages.push({
        role: 'assistant',
        content: `Error: ${(error as Error).message}. Make sure the GenSX workflow server is running.`
      });
      
      this.render();
      this.scrollToBottom();
    }
  }

  private async clearThread(): Promise<void> {
    // Generate new thread ID
    this.state.threadId = this.generateThreadId();
    this.state.messages = [];
    
    // Clear any active execution
    this.clearExecutionState();
    
    // Persist new thread ID
    await this.persistUserState();
    
    // Re-render with empty messages
    this.render();
    
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

  private scrollToBottom(): void {
    setTimeout(() => {
      this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
    }, 0);
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupChatInterface();
});