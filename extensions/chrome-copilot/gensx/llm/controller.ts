/**
 * LLM Controller: Task State Machine & ReAct Loop
 * Implements the server-side task orchestration from the specification
 */

import * as gensx from "@gensx/core";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, generateObject } from "@gensx/vercel-ai";
import { z } from "zod";
import { 
  Task, 
  TaskStatus, 
  PlannedStep, 
  StepRecord, 
  Plan, 
  MiniPCD, 
  ToolCall, 
  ToolResult, 
  Observation,
  PCDActionDetail
} from '../../src/shared/types';
import { skillRegistry } from './skills';
import { goalPredicates } from './goalPredicates';

/**
 * Main LLM Controller Component
 */
export const LLMController = gensx.Component(
  "LLMController",
  async ({
    task,
    tabId,
    toolExecutor
  }: {
    task: Task;
    tabId: number;
    toolExecutor: (call: ToolCall) => Promise<ToolResult>;
  }): Promise<{ task: Task; completed: boolean; message?: string }> => {
    
    console.log(`🎯 Starting LLM Controller for task: ${task.id}`);
    
    let currentTask = { ...task };
    const maxIterations = 20;
    let iteration = 0;
    
    while (iteration < maxIterations && !isTerminalStatus(currentTask.status)) {
      iteration++;
      console.log(`🔄 Task iteration ${iteration}/${maxIterations}`);
      
      try {
        const result = await executeTaskStep(currentTask, tabId, toolExecutor);
        currentTask = result.task;
        
        if (result.completed) {
          console.log(`✅ Task completed: ${currentTask.id}`);
          return { task: currentTask, completed: true, message: result.message };
        }
        
        // Update timestamp
        currentTask.updatedAt = Date.now();
        
      } catch (error) {
        console.error(`❌ Task step failed:`, error);
        
        currentTask.status = 'blocked';
        currentTask.updatedAt = Date.now();
        
        const errorRecord: StepRecord = {
          step: { kind: 'tool', call: { name: 'getMiniPCD', args: { tabId } }, description: 'Error occurred' },
          result: { ok: false, error: error instanceof Error ? error.message : 'Unknown error', retryable: false },
          ts: Date.now(),
          status: 'error'
        };
        
        currentTask.history.push(errorRecord);
        
        return { 
          task: currentTask, 
          completed: false, 
          message: `Task blocked due to error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    }
    
    if (iteration >= maxIterations) {
      currentTask.status = 'failed';
      currentTask.updatedAt = Date.now();
      
      return { 
        task: currentTask, 
        completed: false, 
        message: 'Task failed: Maximum iterations reached' 
      };
    }
    
    return { task: currentTask, completed: false };
  }
);

/**
 * Execute a single step of the task
 */
async function executeTaskStep(
  task: Task,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ task: Task; completed: boolean; message?: string }> {
  
  const updatedTask = { ...task };
  
  switch (task.status) {
    case 'created':
      return await bootstrap(updatedTask, tabId, toolExecutor);
    
    case 'planning':
      return await planNextSteps(updatedTask, tabId, toolExecutor);
    
    case 'executing':
      return await executeCurrentPlan(updatedTask, tabId, toolExecutor);
    
    case 'exploring':
      return await exploreForGoal(updatedTask, tabId, toolExecutor);
    
    case 'awaiting_user':
      // Task is waiting for user input, no action needed
      return { task: updatedTask, completed: false, message: 'Awaiting user input' };
    
    default:
      return { task: updatedTask, completed: true, message: `Task in terminal status: ${task.status}` };
  }
}

/**
 * Bootstrap: Get initial MiniPCD and derive subgoal
 */
async function bootstrap(
  task: Task,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ task: Task; completed: boolean; message?: string }> {
  
  console.log(`🚀 Bootstrapping task: ${task.goal}`);
  
  // Get current MiniPCD
  const miniPCDResult = await toolExecutor({ name: 'getMiniPCD', args: { tabId } });
  
  if (!miniPCDResult.ok) {
    task.status = 'blocked';
    return { 
      task, 
      completed: false, 
      message: `Failed to get page state: ${miniPCDResult.error}` 
    };
  }
  
  const miniPCD = miniPCDResult.data as MiniPCD;
  
  // Update breadcrumbs
  task.breadcrumbs.push({
    url: miniPCD.url,
    title: miniPCD.title,
    labelFrom: 'bootstrap',
    ts: Date.now()
  });
  
  // Derive initial subgoal using LLM
  const subgoal = await deriveSubgoal(task.goal, miniPCD);
  task.subgoal = subgoal;
  
  // Move to planning state
  task.status = 'planning';
  task.progress = 0.1; // 10% for bootstrap
  
  console.log(`📋 Derived subgoal: ${subgoal}`);
  
  return { task, completed: false };
}

/**
 * Plan next steps using skills matching
 */
async function planNextSteps(
  task: Task,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ task: Task; completed: boolean; message?: string }> {
  
  console.log(`📋 Planning steps for subgoal: ${task.subgoal}`);
  
  // Get current MiniPCD
  const miniPCDResult = await toolExecutor({ name: 'getMiniPCD', args: { tabId } });
  if (!miniPCDResult.ok) {
    task.status = 'blocked';
    return { task, completed: false, message: `Failed to get page state: ${miniPCDResult.error}` };
  }
  
  const miniPCD = miniPCDResult.data as MiniPCD;
  
  // Check goal predicates first
  const goalMet = await checkGoalPredicates(task.goal, miniPCD);
  if (goalMet.success) {
    task.status = 'succeeded';
    task.progress = 1.0;
    return { task, completed: true, message: goalMet.message };
  }
  
  // Try skill matching
  const skillMatches = await findMatchingSkills(task.subgoal || task.goal, miniPCD);
  
  if (skillMatches.length === 0) {
    // No skills match, move to exploration
    task.status = 'exploring';
    return { task, completed: false };
  }
  
  // Use best matching skill
  const bestSkill = skillMatches[0];
  
  // Get details for skill binding
  const detailsResult = await toolExecutor({ 
    name: 'getDetails', 
    args: { tabId, ids: bestSkill.requestedIds } 
  });
  
  if (!detailsResult.ok) {
    task.status = 'blocked';
    return { task, completed: false, message: `Failed to get element details: ${detailsResult.error}` };
  }
  
  const details = detailsResult.data as PCDActionDetail[];
  
  // Bind skill to elements
  const binding = await bestSkill.skill.bind(details, bestSkill.params);
  
  if (!binding) {
    // Binding failed, try exploration
    task.status = 'exploring';
    return { task, completed: false };
  }
  
  // Update task bindings
  task.bindings = { ...task.bindings, ...binding.binding };
  
  // Generate plan
  const steps = await bestSkill.skill.plan(binding.binding, bestSkill.params);
  
  const plan: Plan = {
    id: `plan_${Date.now()}`,
    steps,
    rationale: `Using ${bestSkill.skill.name} skill with confidence ${binding.confidence}`,
    createdAt: Date.now()
  };
  
  task.plan = plan;
  task.status = 'executing';
  
  console.log(`📋 Created plan with ${steps.length} steps using ${bestSkill.skill.name}`);
  
  return { task, completed: false };
}

/**
 * Execute current plan steps
 */
async function executeCurrentPlan(
  task: Task,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ task: Task; completed: boolean; message?: string }> {
  
  if (!task.plan || task.plan.steps.length === 0) {
    task.status = 'planning';
    return { task, completed: false };
  }
  
  // Find next unexecuted step
  const executedSteps = task.history.filter(h => h.step.kind === 'tool').length;
  const currentStepIndex = executedSteps;
  
  if (currentStepIndex >= task.plan.steps.length) {
    // Plan completed, check if goal is met
    const miniPCDResult = await toolExecutor({ name: 'getMiniPCD', args: { tabId } });
    if (miniPCDResult.ok) {
      const miniPCD = miniPCDResult.data as MiniPCD;
      const goalMet = await checkGoalPredicates(task.goal, miniPCD);
      
      if (goalMet.success) {
        task.status = 'succeeded';
        task.progress = 1.0;
        return { task, completed: true, message: goalMet.message };
      }
    }
    
    // Plan completed but goal not met, back to planning
    task.status = 'planning';
    task.progress = Math.min(0.8, task.progress + 0.2);
    return { task, completed: false };
  }
  
  const currentStep = task.plan.steps[currentStepIndex];
  
  const stepDescription = currentStep.kind === 'tool' ? currentStep.description :
                        currentStep.kind === 'confirm' ? currentStep.message :
                        `Branch step with ${currentStep.options.length} options`;
  console.log(`⚡ Executing step ${currentStepIndex + 1}/${task.plan.steps.length}: ${stepDescription}`);
  
  // Handle different step types
  let stepResult: { result: ToolResult | null; observation?: Observation };
  
  switch (currentStep.kind) {
    case 'tool':
      stepResult = await executeToolStep(currentStep.call, tabId, toolExecutor);
      break;
      
    case 'confirm':
      // Confirm steps always require user input
      task.status = 'awaiting_user';
      return { task, completed: false, message: `Confirmation required: ${currentStep.message}` };
      
    case 'branch':
      // For now, take first option (could be enhanced with decision logic)
      if (currentStep.options.length > 0) {
        stepResult = await executeToolStep(currentStep.options[0].call, tabId, toolExecutor);
      } else {
        stepResult = { result: { ok: false, error: 'No branch options available', retryable: false } };
      }
      break;
      
    default:
      stepResult = { result: { ok: false, error: 'Unknown step type', retryable: false } };
  }
  
  // Record step execution
  const stepRecord: StepRecord = {
    step: currentStep,
    result: stepResult.result,
    observation: stepResult.observation,
    ts: Date.now(),
    status: stepResult.result?.ok ? 'ok' : 'error'
  };
  
  task.history.push(stepRecord);
  
  // Update progress
  task.progress = Math.min(0.9, 0.2 + (0.7 * (currentStepIndex + 1) / task.plan.steps.length));
  
  // Handle step failure
  if (!stepResult.result?.ok) {
    if (stepResult.result?.retryable) {
      // Refresh MiniPCD and try alt selector
      console.log(`🔄 Step failed, attempting recovery...`);
      // Could implement retry logic here
    }
    
    // Move to exploration if step fails
    task.status = 'exploring';
    return { task, completed: false };
  }
  
  // Update breadcrumbs if observation indicates URL change
  if (stepResult.observation?.urlChanged) {
    task.breadcrumbs.push({
      url: stepResult.observation.url,
      title: stepResult.observation.title,
      labelFrom: stepDescription,
      ts: stepResult.observation.ts
    });
  }
  
  return { task, completed: false };
}

/**
 * Explore for goal when planning fails
 */
async function exploreForGoal(
  task: Task,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ task: Task; completed: boolean; message?: string }> {
  
  console.log(`🔍 Exploring for goal: ${task.goal}`);
  
  // Get current MiniPCD
  const miniPCDResult = await toolExecutor({ name: 'getMiniPCD', args: { tabId } });
  if (!miniPCDResult.ok) {
    task.status = 'blocked';
    return { task, completed: false, message: `Failed to get page state: ${miniPCDResult.error}` };
  }
  
  const miniPCD = miniPCDResult.data as MiniPCD;
  
  // Query for potentially relevant actions
  const queryResult = await toolExecutor({
    name: 'pcd_query',
    args: { tabId, text: task.subgoal || task.goal, topK: 5 }
  });
  
  if (!queryResult.ok || !queryResult.data || !Array.isArray(queryResult.data) || queryResult.data.length === 0) {
    task.status = 'failed';
    return { task, completed: false, message: 'No relevant actions found for exploration' };
  }
  
  // Try clicking the most relevant action
  const bestAction = queryResult.data[0];
  
  const detailsResult = await toolExecutor({
    name: 'getDetails',
    args: { tabId, ids: [bestAction.id] }
  });
  
  if (!detailsResult.ok || !detailsResult.data || !Array.isArray(detailsResult.data) || detailsResult.data.length === 0) {
    task.status = 'failed';
    return { task, completed: false, message: 'Failed to get action details for exploration' };
  }
  
  const detail = detailsResult.data[0];
  
  // Execute exploratory click
  const clickResult = await toolExecutor({
    name: 'dom_click',
    args: { tabId, selector: detail.selector }
  });
  
  if (clickResult.ok) {
    // Update breadcrumbs
    const observation = clickResult.data as Observation;
    if (observation?.urlChanged) {
      task.breadcrumbs.push({
        url: observation.url,
        title: observation.title,
        labelFrom: 'exploration',
        ts: observation.ts
      });
    }
    
    // Move back to planning to reassess
    task.status = 'planning';
    task.progress = Math.min(0.7, task.progress + 0.1);
    
    console.log(`🔍 Exploration action completed, returning to planning`);
    
    return { task, completed: false };
  } else {
    task.status = 'failed';
    return { task, completed: false, message: `Exploration failed: ${clickResult.error}` };
  }
}

/**
 * Execute a tool step
 */
async function executeToolStep(
  toolCall: ToolCall,
  tabId: number,
  toolExecutor: (call: ToolCall) => Promise<ToolResult>
): Promise<{ result: ToolResult; observation?: Observation }> {
  
  // Add tabId to tool call args if not present
  const augmentedCall: ToolCall = {
    ...toolCall,
    args: { ...toolCall.args, tabId } as any
  };
  
  const result = await toolExecutor(augmentedCall);
  
  // Extract observation if present
  let observation: Observation | undefined;
  if (result.ok && result.data && typeof result.data === 'object') {
    const data = result.data as any;
    if (data.url && data.title && data.ts) {
      observation = data as Observation;
    }
  }
  
  return { result, observation };
}

/**
 * Derive subgoal from main goal and current page state
 */
async function deriveSubgoal(goal: string, miniPCD: MiniPCD): Promise<string> {
  try {
    const model = anthropic("claude-3-5-sonnet-20241022");
    
    const result = await generateText({
      model,
      prompt: `Given the user's goal and current page state, determine the most logical next subgoal.

Goal: ${goal}

Current Page:
- URL: ${miniPCD.url}
- Title: ${miniPCD.title}
- Available Actions: ${miniPCD.actions.slice(0, 10).map(a => `${a.role}: "${a.label}"`).join(', ')}
- Available Forms: ${miniPCD.forms.map(f => `${f.purpose || 'form'} with ${f.fieldSummaries.length} fields`).join(', ')}

Respond with a single, specific, actionable subgoal (2-8 words) that moves toward the main goal.
Examples: "find login form", "click search button", "fill contact form", "navigate to billing"

Subgoal:`,
      temperature: 0.1
    });
    
    return result.text.trim().replace(/['"]/g, '');
    
  } catch (error) {
    console.warn('Failed to derive subgoal with LLM, using fallback:', error);
    
    // Fallback: extract key terms from goal
    const goalWords = goal.toLowerCase().split(/\s+/);
    const actionWords = ['find', 'click', 'fill', 'navigate to', 'select'];
    
    for (const actionWord of actionWords) {
      if (goalWords.some(word => actionWord.includes(word))) {
        return `${actionWord} for ${goalWords[goalWords.length - 1]}`;
      }
    }
    
    return `find ${goalWords[goalWords.length - 1]}`;
  }
}

/**
 * Find matching skills for the current subgoal
 */
async function findMatchingSkills(
  subgoal: string,
  miniPCD: MiniPCD
): Promise<Array<{ skill: any; params: any; requestedIds: string[]; confidence: number }>> {
  
  const matches: Array<{ skill: any; params: any; requestedIds: string[]; confidence: number }> = [];
  
  for (const [skillName, skill] of Object.entries(skillRegistry)) {
    try {
      // Match skill-specific parameters
      let params: any;
      switch (skillName) {
        case 'login':
          params = {}; // Would extract from context
          break;
        case 'search':
          params = { query: subgoal };
          break;
        case 'navigation':
          params = { target: subgoal };
          break;
        case 'formFill':
          params = { fields: {} }; // Would extract from context
          break;
        case 'dataExtract':
          params = { fields: ['title', 'link'] }; // Default fields
          break;
        default:
          params = {};
      }
      
      const skillMatches = await skill.match(miniPCD, params);
      
      for (const match of skillMatches) {
        matches.push({
          skill,
          params,
          requestedIds: match.requestedIds,
          confidence: match.confidence
        });
      }
      
    } catch (error) {
      console.warn(`Skill ${skillName} matching failed:`, error);
    }
  }
  
  // Sort by confidence
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return matches.filter(m => m.confidence > 0.5); // Only return confident matches
}

/**
 * Check if goal predicates are satisfied
 */
async function checkGoalPredicates(
  goal: string,
  miniPCD: MiniPCD
): Promise<{ success: boolean; message?: string }> {
  
  for (const predicate of goalPredicates) {
    const result = await predicate.check(goal, miniPCD);
    if (result.satisfied) {
      return { success: true, message: result.message };
    }
  }
  
  return { success: false };
}

/**
 * Check if task status is terminal
 */
function isTerminalStatus(status: TaskStatus): boolean {
  return ['succeeded', 'failed', 'cancelled'].includes(status);
}