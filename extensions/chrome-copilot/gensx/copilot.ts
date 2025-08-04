/**
 * New LLM-based Copilot Workflow
 * Replaces multiAgentWorkflow.ts with the new architecture
 */

import * as gensx from "@gensx/core";
import { CoreMessage } from "ai";
import { useBlob } from "@gensx/storage";

import { Task, MiniPCD, ToolCall, ToolResult } from "../src/shared/types";
import { LLMController } from "./llm/controller";

type ThreadData = {
  messages: CoreMessage[];
};

/**
 * New Copilot Workflow using LLM Controller and Task State Machine
 */
export const copilotWorkflow = gensx.Workflow(
  "copilot",
  async ({
    prompt,
    threadId,
    userId,
    url,
    userName,
    userContext,
  }: {
    prompt: string;
    threadId: string;
    userId: string;
    url: string;
    userName?: string;
    userContext?: string;
  }): Promise<{ response: string; messages: CoreMessage[] }> => {

    try {
      console.log(`🤖 Starting new copilot workflow for user ${userId}`);

      // Load chat history
      const chatHistoryBlob = useBlob<ThreadData>(
        chatHistoryBlobPath(userId, threadId)
      );

      const loadThreadData = async (): Promise<ThreadData> => {
        const data = await chatHistoryBlob.getJSON();
        if (Array.isArray(data)) {
          return { messages: data };
        }
        return data ?? { messages: [] };
      };

      const saveThreadData = async (threadData: ThreadData): Promise<void> => {
        await chatHistoryBlob.putJSON(threadData);
      };

      const threadData = await loadThreadData();
      const existingMessages = threadData.messages;


      // Create or update task for this request
      const task = await createOrUpdateTask({
        userId,
        goal: prompt,
        url,
        threadId
      });

      // Execute task using LLM Controller
      const taskResult = await executeTask(task, url);

      // Update conversation history
      const userMessage: CoreMessage = {
        role: "user",
        content: prompt
      };

      const assistantMessage: CoreMessage = {
        role: "assistant",
        content: taskResult.response
      };

      const updatedMessages = [
        ...existingMessages,
        userMessage,
        assistantMessage
      ];

      await saveThreadData({ messages: updatedMessages });

      return {
        response: taskResult.response,
        messages: updatedMessages
      };

    } catch (error) {
      console.error("Copilot workflow error:", error);

      const errorMessage: CoreMessage = {
        role: "assistant",
        content: `I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your request.`
      };

      // Try to save error to history
      try {
        const chatHistoryBlob = useBlob<ThreadData>(
          chatHistoryBlobPath(userId, threadId)
        );

        const threadData = await (async () => {
          try {
            const data = await chatHistoryBlob.getJSON();
            if (Array.isArray(data)) {
              return { messages: data };
            }
            return data ?? { messages: [] };
          } catch {
            return { messages: [] };
          }
        })();

        const errorMessages = [
          ...threadData.messages,
          { role: "user", content: prompt },
          errorMessage
        ];

        await chatHistoryBlob.putJSON({ messages: errorMessages });

        return {
          response: errorMessage.content as string,
          messages: errorMessages
        };

      } catch (saveError) {
        console.error("Error saving thread data:", saveError);

        return {
          response: errorMessage.content as string,
          messages: [errorMessage]
        };
      }
    }
  }
);

/**
 * Create or update task for the current request
 */
async function createOrUpdateTask({
  userId,
  goal,
  url,
  threadId
}: {
  userId: string;
  goal: string;
  url: string;
  threadId: string;
}): Promise<Task> {

  const taskId = `task_${threadId}_${Date.now()}`;
  const now = Date.now();

  const task: Task = {
    id: taskId,
    userId,
    goal,
    status: 'created',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    breadcrumbs: [{
      url,
      title: 'Starting page',
      labelFrom: 'initial',
      ts: now
    }],
    siteGraph: { nodes: 0, edges: 0, recentUrls: [url] },
    history: [],
    bindings: {}
  };

  return task;
}

/**
 * Execute task using the LLM Controller
 */
async function executeTask(
  task: Task,
  currentUrl: string
): Promise<{ response: string; completed: boolean }> {

  console.log(`🎯 Executing task: ${task.goal}`);

  // Mock tab ID (in real implementation, this would come from the extension)
  const tabId = 1;

  // Create tool executor that would interface with the Chrome extension
  const toolExecutor = async (toolCall: ToolCall): Promise<ToolResult> => {
    // In the real implementation, this would communicate with the extension
    // For now, return mock results
    console.log(`🔧 Mock tool execution: ${toolCall.name}`, toolCall.args);

    switch (toolCall.name) {
      case 'getMiniPCD':
        return {
          ok: true,
          data: createMockMiniPCD(currentUrl)
        };

      case 'pcd.query':
        return {
          ok: true,
          data: [
            { id: 'action_1', label: 'Search', kind: 'search', score: 0.9 },
            { id: 'action_2', label: 'Login', kind: 'login', score: 0.7 }
          ]
        };

      case 'getDetails':
        return {
          ok: true,
          data: [{
            id: toolCall.args.ids[0],
            selector: { kind: 'role', role: 'button', name: 'Search' },
            altSelectors: [{ kind: 'css', css: '.search-btn' }]
          }]
        };

      case 'dom.click':
      case 'dom.type':
      case 'dom.submit':
        return {
          ok: true,
          data: {
            url: currentUrl,
            title: 'Page after action',
            ts: Date.now(),
            urlChanged: false
          }
        };

      default:
        return {
          ok: false,
          error: `Unknown tool: ${toolCall.name}`,
          retryable: false
        };
    }
  };

  try {
    // Execute task using LLM Controller
    const controllerResult = await LLMController({
      task,
      tabId,
      toolExecutor
    });

    const finalTask = controllerResult.task;

    // Generate response based on task status and progress
    let response = "";

    switch (finalTask.status) {
      case 'succeeded':
        response = `✅ Task completed successfully! ${controllerResult.message || 'Goal achieved.'}`;
        break;

      case 'blocked':
        response = `⚠️  Task is blocked: ${controllerResult.message || 'Unable to proceed.'}`;
        break;

      case 'failed':
        response = `❌ Task failed: ${controllerResult.message || 'Could not complete the goal.'}`;
        break;

      case 'awaiting_user':
        response = `🤔 I need your input: ${controllerResult.message || 'Please provide additional information.'}`;
        break;

      case 'exploring':
        response = `🔍 Exploring the page to find a way to ${finalTask.goal}... Progress: ${Math.round(finalTask.progress * 100)}%`;
        break;

      case 'executing':
        response = `⚡ Working on: ${finalTask.subgoal || finalTask.goal}... Progress: ${Math.round(finalTask.progress * 100)}%`;
        break;

      case 'planning':
        response = `📋 Planning how to ${finalTask.subgoal || finalTask.goal}... Progress: ${Math.round(finalTask.progress * 100)}%`;
        break;

      default:
        response = `🤖 Processing your request: ${finalTask.goal}... Progress: ${Math.round(finalTask.progress * 100)}%`;
    }

    // Add execution details if available
    if (finalTask.history.length > 0) {
      const lastStep = finalTask.history[finalTask.history.length - 1];
      const stepDescription = lastStep.step.kind === 'tool' ? lastStep.step.description :
                            lastStep.step.kind === 'confirm' ? lastStep.step.message :
                            'action';

      if (stepDescription) {
        response += `\n\nLast action: ${stepDescription}`;

        if (lastStep.status === 'error' && lastStep.result && !lastStep.result.ok) {
          response += ` (${lastStep.result.error})`;
        }
      }
    }

    return {
      response,
      completed: controllerResult.completed
    };

  } catch (error) {
    console.error("Task execution failed:", error);

    return {
      response: `❌ Failed to execute task: ${error instanceof Error ? error.message : 'Unknown error'}`,
      completed: false
    };
  }
}

/**
 * Create mock MiniPCD for testing
 */
function createMockMiniPCD(url: string): MiniPCD {
  return {
    url,
    origin: new URL(url).origin,
    title: 'Mock Page',
    loginState: 'unknown',
    ts: Date.now(),
    landmarks: ['main', 'header'],
    actions: [
      {
        id: 'action_1',
        label: 'Search',
        role: 'button',
        kind: 'search',
        landmark: 'main',
        aboveFold: true
      },
      {
        id: 'action_2',
        label: 'Login',
        role: 'link',
        kind: 'login',
        landmark: 'header',
        aboveFold: true
      }
    ],
    forms: [
      {
        id: 'form_1',
        purpose: 'search',
        landmark: 'main',
        fieldSummaries: [
          { label: 'Query', type: 'text', required: true }
        ],
        submitLabel: 'Search'
      }
    ],
    collections: [],
    metrics: {
      ariaCoverage: 0.8,
      viewportH: 800,
      viewportW: 1200
    }
  };
}


function chatHistoryBlobPath(userId: string, threadId: string): string {
  return `chat-history/${userId}/${threadId}.json`;
}
