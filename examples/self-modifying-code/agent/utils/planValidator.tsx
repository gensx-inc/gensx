import * as path from 'path';
import { z } from 'zod';

/**
 * Interface for a plan step
 */
export interface PlanStep {
  id: string;
  description: string;
  type: 'create' | 'modify' | 'delete' | 'verify' | 'build' | 'test' | 'rollback';
  filePath?: string;
  dependencies?: string[]; // IDs of steps this step depends on
  riskLevel?: 'low' | 'medium' | 'high';
  rollbackStepId?: string; // ID of step that can roll back this change
}

/**
 * Interface for a complete plan
 */
export interface Plan {
  steps: PlanStep[];
  goal: string;
  validationSteps: string[];
  rollbackPlan?: PlanStep[];
}

/**
 * Schema for validation results
 */
export const planValidationSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(z.object({
    type: z.enum(['error', 'warning', 'info']),
    message: z.string(),
    stepId: z.string().optional(),
  })),
  suggestions: z.array(z.string()).optional(),
});

export type PlanValidationResult = z.infer<typeof planValidationSchema>;

/**
 * Validates a plan for feasibility and correctness
 * @param plan Plan to validate
 * @param existingFiles List of existing files in the project
 * @returns Validation result
 */
export function validatePlan(plan: Plan, existingFiles: string[]): PlanValidationResult {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    stepId?: string;
  }> = [];
  
  // Check if the plan has steps
  if (plan.steps.length === 0) {
    issues.push({
      type: 'error',
      message: 'Plan has no steps',
    });
    
    return {
      isValid: false,
      issues,
      suggestions: ['Add steps to the plan'],
    };
  }
  
  // Check for duplicate step IDs
  const stepIds = new Set<string>();
  for (const step of plan.steps) {
    if (stepIds.has(step.id)) {
      issues.push({
        type: 'error',
        message: `Duplicate step ID: ${step.id}`,
        stepId: step.id,
      });
    }
    stepIds.add(step.id);
  }
  
  // Check for circular dependencies
  const dependencyIssues = checkForCircularDependencies(plan.steps);
  issues.push(...dependencyIssues);
  
  // Check for missing files in modify/delete steps
  for (const step of plan.steps) {
    if ((step.type === 'modify' || step.type === 'delete') && step.filePath) {
      const normalizedPath = normalizePath(step.filePath);
      
      if (!existingFiles.some(file => normalizePath(file) === normalizedPath)) {
        issues.push({
          type: 'error',
          message: `Step ${step.id} references non-existent file: ${step.filePath}`,
          stepId: step.id,
        });
      }
    }
  }
  
  // Check for dependencies on non-existent steps
  for (const step of plan.steps) {
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        if (!stepIds.has(depId)) {
          issues.push({
            type: 'error',
            message: `Step ${step.id} depends on non-existent step: ${depId}`,
            stepId: step.id,
          });
        }
      }
    }
  }
  
  // Check for rollback steps on high-risk changes
  const highRiskSteps = plan.steps.filter(step => step.riskLevel === 'high');
  for (const step of highRiskSteps) {
    if (!step.rollbackStepId) {
      issues.push({
        type: 'warning',
        message: `High-risk step ${step.id} has no rollback step defined`,
        stepId: step.id,
      });
    } else if (!stepIds.has(step.rollbackStepId)) {
      issues.push({
        type: 'error',
        message: `Step ${step.id} references non-existent rollback step: ${step.rollbackStepId}`,
        stepId: step.id,
      });
    }
  }
  
  // Check for verification steps
  const verificationSteps = plan.steps.filter(step => step.type === 'verify' || step.type === 'test' || step.type === 'build');
  if (verificationSteps.length === 0) {
    issues.push({
      type: 'warning',
      message: 'Plan has no verification steps',
    });
  }
  
  // Generate suggestions based on issues
  const suggestions = generateSuggestions(issues, plan);
  
  return {
    isValid: !issues.some(issue => issue.type === 'error'),
    issues,
    suggestions,
  };
}

/**
 * Checks for circular dependencies in plan steps
 * @param steps Plan steps
 * @returns Issues related to circular dependencies
 */
function checkForCircularDependencies(steps: PlanStep[]): Array<{
  type: 'error' | 'warning' | 'info';
  message: string;
  stepId?: string;
}> {
  const issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    stepId?: string;
  }> = [];
  
  // Build dependency graph
  const graph: Record<string, string[]> = {};
  for (const step of steps) {
    graph[step.id] = step.dependencies || [];
  }
  
  // Check for cycles using DFS
  const visited = new Set<string>();
  const recStack = new Set<string>();
  
  function dfs(stepId: string): boolean {
    if (!visited.has(stepId)) {
      visited.add(stepId);
      recStack.add(stepId);
      
      for (const depId of graph[stepId] || []) {
        if (!visited.has(depId) && dfs(depId)) {
          issues.push({
            type: 'error',
            message: `Circular dependency detected involving step ${stepId}`,
            stepId,
          });
          return true;
        } else if (recStack.has(depId)) {
          issues.push({
            type: 'error',
            message: `Circular dependency detected between steps ${stepId} and ${depId}`,
            stepId,
          });
          return true;
        }
      }
    }
    
    recStack.delete(stepId);
    return false;
  }
  
  for (const step of steps) {
    if (!visited.has(step.id)) {
      dfs(step.id);
    }
  }
  
  return issues;
}

/**
 * Normalizes a file path for comparison
 * @param filePath File path to normalize
 * @returns Normalized path
 */
function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Generates suggestions based on validation issues
 * @param issues Validation issues
 * @param plan Plan being validated
 * @returns Array of suggestions
 */
function generateSuggestions(
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    stepId?: string;
  }>,
  plan: Plan
): string[] {
  const suggestions: string[] = [];
  
  for (const issue of issues) {
    if (issue.type === 'error') {
      if (issue.message.includes('non-existent file')) {
        suggestions.push('Check file paths to ensure they exist in the project');
      } else if (issue.message.includes('circular dependency')) {
        suggestions.push('Restructure the plan to remove circular dependencies between steps');
      } else if (issue.message.includes('depends on non-existent step')) {
        suggestions.push('Check step IDs in dependency lists to ensure they reference existing steps');
      } else if (issue.message.includes('non-existent rollback step')) {
        suggestions.push('Define rollback steps for all high-risk operations');
      }
    } else if (issue.type === 'warning') {
      if (issue.message.includes('no verification steps')) {
        suggestions.push('Add verification steps (build, test) to validate changes');
      } else if (issue.message.includes('no rollback step')) {
        suggestions.push('Define rollback steps for high-risk operations');
      }
    }
  }
  
  // Add general suggestions
  if (plan.steps.length > 0 && !plan.steps.some(step => step.type === 'build')) {
    suggestions.push('Add a build step to verify that changes compile successfully');
  }
  
  if (plan.steps.length > 0 && !plan.steps.some(step => step.type === 'test')) {
    suggestions.push('Add test steps to verify functionality after changes');
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Sorts plan steps based on dependencies to create an execution order
 * @param plan Plan to sort
 * @returns Sorted array of plan steps
 */
export function sortPlanSteps(plan: Plan): PlanStep[] {
  const steps = [...plan.steps];
  const visited = new Set<string>();
  const result: PlanStep[] = [];
  
  function visit(stepId: string) {
    if (visited.has(stepId)) {
      return;
    }
    
    visited.add(stepId);
    
    const step = steps.find(s => s.id === stepId);
    if (!step) {
      return;
    }
    
    // Visit dependencies first
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        visit(depId);
      }
    }
    
    result.push(step);
  }
  
  // Visit all steps
  for (const step of steps) {
    visit(step.id);
  }
  
  return result;
}

/**
 * Creates a rollback plan for a given plan
 * @param plan Original plan
 * @returns Rollback plan
 */
export function createRollbackPlan(plan: Plan): PlanStep[] {
  const rollbackSteps: PlanStep[] = [];
  
  // Process steps in reverse order
  for (let i = plan.steps.length - 1; i >= 0; i--) {
    const step = plan.steps[i];
    
    // Skip verification steps
    if (step.type === 'verify' || step.type === 'test' || step.type === 'build') {
      continue;
    }
    
    // Use defined rollback step if available
    if (step.rollbackStepId) {
      const rollbackStep = plan.steps.find(s => s.id === step.rollbackStepId);
      if (rollbackStep) {
        rollbackSteps.push({
          ...rollbackStep,
          id: `rollback-${step.id}`,
          description: `Rollback: ${rollbackStep.description}`,
        });
        continue;
      }
    }
    
    // Generate default rollback step based on step type
    if (step.type === 'create' && step.filePath) {
      rollbackSteps.push({
        id: `rollback-${step.id}`,
        description: `Delete file created in step ${step.id}`,
        type: 'delete',
        filePath: step.filePath,
        riskLevel: 'low',
      });
    } else if (step.type === 'modify' && step.filePath) {
      rollbackSteps.push({
        id: `rollback-${step.id}`,
        description: `Restore original version of file modified in step ${step.id}`,
        type: 'modify',
        filePath: step.filePath,
        riskLevel: 'medium',
      });
    } else if (step.type === 'delete' && step.filePath) {
      rollbackSteps.push({
        id: `rollback-${step.id}`,
        description: `Recreate file deleted in step ${step.id}`,
        type: 'create',
        filePath: step.filePath,
        riskLevel: 'medium',
      });
    }
  }
  
  return rollbackSteps;
}

/**
 * Parses a plan from a text description
 * @param planText Plan description text
 * @returns Structured plan object
 */
export function parsePlanFromText(planText: string): Plan {
  const steps: PlanStep[] = [];
  let goal = '';
  const validationSteps: string[] = [];
  
  // Extract goal
  const goalMatch = planText.match(/(?:goal|objective|aim):\s*(.+?)(?:\n|$)/i);
  if (goalMatch) {
    goal = goalMatch[1].trim();
  }
  
  // Extract steps
  const stepMatches = planText.matchAll(/(?:step|task)\s+(\d+):\s*(.+?)(?=(?:step|task)\s+\d+:|$)/gis);
  
  let stepIndex = 0;
  for (const match of stepMatches) {
    const stepNumber = match[1];
    const stepDescription = match[2].trim();
    
    // Determine step type
    let type: PlanStep['type'] = 'modify';
    let filePath: string | undefined;
    let riskLevel: PlanStep['riskLevel'] = 'low';
    
    if (stepDescription.match(/creat(e|ing)/i)) {
      type = 'create';
    } else if (stepDescription.match(/delet(e|ing)/i)) {
      type = 'delete';
      riskLevel = 'high';
    } else if (stepDescription.match(/verif(y|ying)/i)) {
      type = 'verify';
    } else if (stepDescription.match(/test(ing)?/i)) {
      type = 'test';
    } else if (stepDescription.match(/build(ing)?/i)) {
      type = 'build';
    } else if (stepDescription.match(/rollback/i)) {
      type = 'rollback';
    }
    
    // Extract file path
    const filePathMatch = stepDescription.match(/(?:file|in|at)\s+[`'"](.*?)[`'"]/i);
    if (filePathMatch) {
      filePath = filePathMatch[1];
    }
    
    // Determine risk level
    if (stepDescription.match(/high risk|careful|caution/i)) {
      riskLevel = 'high';
    } else if (stepDescription.match(/medium risk|moderate/i)) {
      riskLevel = 'medium';
    }
    
    // Create step
    const step: PlanStep = {
      id: `step-${stepNumber}`,
      description: stepDescription,
      type,
      filePath,
      riskLevel,
    };
    
    steps.push(step);
    
    // Track validation steps
    if (type === 'verify' || type === 'test' || type === 'build') {
      validationSteps.push(step.id);
    }
    
    stepIndex++;
  }
  
  // Try to infer dependencies between steps
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Check if step description references other steps
    for (let j = 0; j < steps.length; j++) {
      if (i === j) continue;
      
      const otherStep = steps[j];
      const otherStepNumber = otherStep.id.replace('step-', '');
      
      if (step.description.match(new RegExp(`step\\s+${otherStepNumber}|after\\s+step\\s+${otherStepNumber}`, 'i'))) {
        if (!step.dependencies) {
          step.dependencies = [];
        }
        step.dependencies.push(otherStep.id);
      }
    }
    
    // Default dependencies: each step depends on the previous step
    if (!step.dependencies && i > 0) {
      step.dependencies = [steps[i - 1].id];
    }
  }
  
  return {
    steps,
    goal,
    validationSteps,
  };
}

/**
 * Creates a more detailed plan with explicit dependencies and rollback steps
 * @param plan Basic plan
 * @param existingFiles List of existing files in the project
 * @returns Enhanced plan
 */
export function enhancePlan(plan: Plan, existingFiles: string[]): Plan {
  // Validate the plan first
  const validation = validatePlan(plan, existingFiles);
  
  if (!validation.isValid) {
    throw new Error(`Cannot enhance invalid plan: ${validation.issues.map(i => i.message).join(', ')}`);
  }
  
  // Create a copy of the plan
  const enhancedPlan: Plan = {
    ...plan,
    steps: [...plan.steps],
  };
  
  // Add explicit verification steps after each file modification
  const newSteps: PlanStep[] = [];
  
  for (const step of enhancedPlan.steps) {
    newSteps.push(step);
    
    if ((step.type === 'create' || step.type === 'modify') && step.filePath) {
      // Add a verification step after each file modification
      const verifyStep: PlanStep = {
        id: `verify-${step.id}`,
        description: `Verify changes made in step ${step.id}`,
        type: 'verify',
        dependencies: [step.id],
        riskLevel: 'low',
      };
      
      newSteps.push(verifyStep);
      enhancedPlan.validationSteps.push(verifyStep.id);
    }
  }
  
  // Add a final build step if there isn't one already
  if (!enhancedPlan.steps.some(step => step.type === 'build')) {
    const buildStep: PlanStep = {
      id: 'final-build',
      description: 'Build the project to verify all changes',
      type: 'build',
      dependencies: newSteps.filter(step => step.type !== 'build').map(step => step.id),
      riskLevel: 'low',
    };
    
    newSteps.push(buildStep);
    enhancedPlan.validationSteps.push(buildStep.id);
  }
  
  // Create rollback steps for high-risk operations
  const highRiskSteps = newSteps.filter(step => step.riskLevel === 'high');
  for (const step of highRiskSteps) {
    if (!step.rollbackStepId) {
      // Create a rollback step
      const rollbackStep: PlanStep = {
        id: `rollback-${step.id}`,
        description: `Rollback changes made in step ${step.id}`,
        type: 'rollback',
        filePath: step.filePath,
        riskLevel: 'medium',
      };
      
      newSteps.push(rollbackStep);
      step.rollbackStepId = rollbackStep.id;
    }
  }
  
  // Create a complete rollback plan
  enhancedPlan.rollbackPlan = createRollbackPlan(enhancedPlan);
  
  // Update the steps
  enhancedPlan.steps = newSteps;
  
  return enhancedPlan;
}