// TypeScript type definitions for the GenSX Copilot Chrome Extension

export interface CopilotSettings {
  // API Configuration
  apiEndpoint: string;
  apiKey: string;
  org: string;
  project: string;
  environment: string;

  // Copilot Behavior
  autoOpen: boolean;
  enableShortcuts: boolean;
  defaultWidth: number;

  // User Preferences
  userName: string;
  userContext: string;
}

export interface CopilotState {
  isOpen: boolean;
  paneWidth: number;
  isResizing: boolean;
  activeTab: 'chat' | 'tools' | 'history' | 'details' | 'preferences' | 'knowledge';
  messages: CopilotMessage[];
  expandedTools: Set<string>;
  isStreaming: boolean;
  userId: string;
  threadId: string;
}

export interface TodoItem {
  title: string;
  completed: boolean;
}

export interface TodoList {
  items: TodoItem[];
}

export interface CopilotMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | MessageContent[];
  timestamp?: number;
  toolCalls?: ToolCall[];
}

export type MessageContent = TextPart | ToolCallPart | ToolResultPart;

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ToolCallPart {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: any;
}

export interface ToolResultPart {
  type: 'tool-result';
  toolCallId: string;
  result: any;
}

export interface ToolCall {
  id: string;
  toolCallId: string;
  name: string;
  toolName: string;
  arguments: Record<string, any>;
  args: Record<string, any>;
  result?: any;
  error?: string;
}

export interface ExtensionMessage {
  type: 'GET_TAB_INFO' | 'EXECUTE_TOOL' | 'SEND_MESSAGE' | 'TOGGLE_COPILOT' | 'WORKFLOW_REQUEST' | 'WORKFLOW_RESPONSE' | 'WORKFLOW_ERROR' | 'WORKFLOW_STREAM_UPDATE' | 'WORKFLOW_STREAM_COMPLETE' | 'WORKFLOW_MESSAGES_UPDATE' | 'WORKFLOW_TODO_LIST_UPDATE' | 'WORKFLOW_RECONNECT' | 'WORKFLOW_EXECUTION_STARTED' | 'EXTERNAL_TOOL_CALL' | 'EXTERNAL_TOOL_RESPONSE' | 'GET_THREAD_HISTORY' | 'GET_WEBSITE_KNOWLEDGE' | 'DELETE_WEBSITE_KNOWLEDGE' | 'CONTENT_SCRIPT_READY' | 'UPDATE_CURRENT_TAB';
  data?: any;
  tabId?: number;
  requestId?: string;
  url?: string;
  timestamp?: number;
}

export interface WorkflowMessage {
  type: 'WORKFLOW_REQUEST';
  requestId: string;
  data: {
    prompt: string;
    threadId: string;
    userId: string;
    url: string;
    userName?: string;
    userContext?: string;
    tabId?: number;
  };
}

export interface WorkflowResponseMessage {
  type: 'WORKFLOW_RESPONSE';
  requestId: string;
  data: {
    result: string;
    messages?: CopilotMessage[];
  };
}

export interface WorkflowErrorMessage {
  type: 'WORKFLOW_ERROR';
  requestId: string;
  error: string;
}

export interface WorkflowStreamUpdateMessage {
  type: 'WORKFLOW_STREAM_UPDATE';
  requestId: string;
  data: {
    text: string;
    isIncremental: boolean;
  };
}

export interface WorkflowStreamCompleteMessage {
  type: 'WORKFLOW_STREAM_COMPLETE';
  requestId: string;
  data: {
    finalMessage: string;
  };
}

export interface ExternalToolCallMessage {
  type: 'EXTERNAL_TOOL_CALL';
  requestId: string;
  data: {
    toolName: string;
    params: any;
    nodeId: string;
    paramsSchema: any;
    resultSchema: any;
  };
}

export interface ExternalToolResponseMessage {
  type: 'EXTERNAL_TOOL_RESPONSE';
  requestId: string;
  data: {
    toolName: string;
    nodeId: string;
    result: any;
    error?: string;
  };
}

export interface WorkflowMessagesUpdateMessage {
  type: 'WORKFLOW_MESSAGES_UPDATE';
  requestId: string;
  data: {
    messages: CopilotMessage[];
    isIncremental: boolean;
  };
}

export interface WorkflowTodoListUpdateMessage {
  type: 'WORKFLOW_TODO_LIST_UPDATE';
  requestId: string;
  data: {
    todoList: TodoList;
  };
}

export interface TabInfo {
  url: string;
  title: string;
  domain: string;
  id?: number;
}

export interface WorkflowRequest {
  prompt: string;
  threadId: string;
  userId: string;
  url: string;
  userName?: string;
  userContext?: string;
}

export interface WorkflowResponse {
  result: string;
  messages: CopilotMessage[];
}

// Settings storage utilities
export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: CopilotSettings = {
    apiEndpoint: 'http://localhost:1337',
    apiKey: '',
    org: 'gensx',
    project: 'chrome-copilot',
    environment: 'default',
    autoOpen: false,
    enableShortcuts: true,
    defaultWidth: 30,
    userName: '',
    userContext: ''
  };

  static async get(): Promise<CopilotSettings> {
    try {
      const settings = await chrome.storage.sync.get(this.DEFAULT_SETTINGS) as CopilotSettings;
      return settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return this.DEFAULT_SETTINGS;
    }
  }

  static async set(settings: Partial<CopilotSettings>): Promise<void> {
    try {
      // Validate settings before saving
      const validatedSettings = this.validate(settings);
      await chrome.storage.sync.set(validatedSettings);
    } catch (error) {
      console.error('Error setting settings:', error);
      throw error;
    }
  }

  static validate(settings: Partial<CopilotSettings>): Partial<CopilotSettings> {
    const validated: Partial<CopilotSettings> = { ...settings };

    // Validate API endpoint
    if (validated.apiEndpoint !== undefined) {
      if (!validated.apiEndpoint.trim()) {
        validated.apiEndpoint = this.DEFAULT_SETTINGS.apiEndpoint;
      } else {
        try {
          new URL(validated.apiEndpoint);
        } catch {
          throw new Error('Invalid API endpoint URL');
        }
      }
    }

    // Validate default width
    if (validated.defaultWidth !== undefined) {
      const width = Number(validated.defaultWidth);
      if (isNaN(width) || width < 20 || width > 60) {
        validated.defaultWidth = this.DEFAULT_SETTINGS.defaultWidth;
      } else {
        validated.defaultWidth = width;
      }
    }

    // Sanitize text inputs
    if (validated.userName !== undefined) {
      validated.userName = validated.userName.trim().slice(0, 100);
    }

    if (validated.userContext !== undefined) {
      validated.userContext = validated.userContext.trim().slice(0, 1000);
    }

    if (validated.apiKey !== undefined) {
      validated.apiKey = validated.apiKey.trim();
    }

    // Validate GenSX project settings
    if (validated.org !== undefined) {
      validated.org = validated.org.trim() || this.DEFAULT_SETTINGS.org;
    }

    if (validated.project !== undefined) {
      validated.project = validated.project.trim() || this.DEFAULT_SETTINGS.project;
    }

    if (validated.environment !== undefined) {
      validated.environment = validated.environment.trim() || this.DEFAULT_SETTINGS.environment;
    }

    return validated;
  }

  static async reset(): Promise<void> {
    try {
      await chrome.storage.sync.set(this.DEFAULT_SETTINGS);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  }

  static getDefaults(): CopilotSettings {
    return { ...this.DEFAULT_SETTINGS };
  }
}
