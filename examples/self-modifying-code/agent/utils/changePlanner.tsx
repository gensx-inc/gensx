import fs from "fs/promises";
import path from "path";
import { readFile, writeFile, pathExists } from "./fileOperations.js";

/**
 * Change Planning and Tracking System
 * 
 * This module provides functionality to plan and track changes across multiple files,
 * ensuring consistency and providing rollback capabilities if issues occur.
 */

// Types for change planning
export interface PlannedChange {
  id: string;
  filePath: string;
  description: string;
  type: "create" | "modify" | "delete";
  dependencies: string[]; // IDs of other changes this depends on
  content?: string; // New content for create/modify
  originalContent?: string; // Original content for modify/delete (for rollback)
  status: "pending" | "applied" | "failed" | "rolled-back";
  error?: string;
}

export interface ChangeSet {
  id: string;
  name: string;
  description: string;
  changes: PlannedChange[];
  status: "planning" | "validating" | "applying" | "completed" | "failed" | "rolled-back";
  createdAt: Date;
  completedAt?: Date;
}

// In-memory storage for change sets
const changeSets: Record<string, ChangeSet> = {};

/**
 * Create a new change set for planning multiple related changes
 */
export function createChangeSet(name: string, description: string): ChangeSet {
  const id = `cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const changeSet: ChangeSet = {
    id,
    name,
    description,
    changes: [],
    status: "planning",
    createdAt: new Date(),
  };
  
  changeSets[id] = changeSet;
  return changeSet;
}

/**
 * Add a planned change to a change set
 */
export function addPlannedChange(
  changeSetId: string,
  change: Omit<PlannedChange, "id" | "status">
): PlannedChange {
  const changeSet = changeSets[changeSetId];
  
  if (!changeSet) {
    throw new Error(`Change set with ID ${changeSetId} not found`);
  }
  
  if (changeSet.status !== "planning") {
    throw new Error(`Cannot add changes to change set with status ${changeSet.status}`);
  }
  
  const id = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const plannedChange: PlannedChange = {
    ...change,
    id,
    status: "pending",
  };
  
  changeSet.changes.push(plannedChange);
  return plannedChange;
}

/**
 * Validate a change set to ensure all dependencies are met and changes are consistent
 */
export async function validateChangeSet(changeSetId: string): Promise<{ valid: boolean; errors: string[] }> {
  const changeSet = changeSets[changeSetId];
  
  if (!changeSet) {
    throw new Error(`Change set with ID ${changeSetId} not found`);
  }
  
  changeSet.status = "validating";
  
  const errors: string[] = [];
  
  // Check for circular dependencies
  const dependencyGraph: Record<string, string[]> = {};
  changeSet.changes.forEach(change => {
    dependencyGraph[change.id] = change.dependencies;
  });
  
  const circularDeps = findCircularDependencies(dependencyGraph);
  if (circularDeps.length > 0) {
    errors.push(`Circular dependencies detected: ${circularDeps.join(" -> ")}`);
  }
  
  // Check for missing dependencies
  const changeIds = new Set(changeSet.changes.map(change => change.id));
  for (const change of changeSet.changes) {
    for (const depId of change.dependencies) {
      if (!changeIds.has(depId)) {
        errors.push(`Change ${change.id} depends on non-existent change ${depId}`);
      }
    }
  }
  
  // Validate file existence for modifications and deletions
  for (const change of changeSet.changes) {
    if (change.type === "modify" || change.type === "delete") {
      const exists = await pathExists(change.filePath);
      if (!exists) {
        errors.push(`File ${change.filePath} does not exist for ${change.type} operation`);
      } else if (change.type === "modify") {
        // Read original content for rollback purposes
        const result = await readFile(change.filePath);
        if (result.success && result.content) {
          change.originalContent = result.content;
        } else {
          errors.push(`Failed to read original content from ${change.filePath}: ${result.error}`);
        }
      }
    } else if (change.type === "create") {
      const exists = await pathExists(change.filePath);
      if (exists) {
        errors.push(`File ${change.filePath} already exists for create operation`);
      }
      
      if (!change.content) {
        errors.push(`No content provided for create operation on ${change.filePath}`);
      }
    }
  }
  
  // Reset status if validation failed
  if (errors.length > 0) {
    changeSet.status = "planning";
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Apply all changes in a change set in dependency order
 */
export async function applyChangeSet(changeSetId: string): Promise<{ success: boolean; errors: string[] }> {
  const changeSet = changeSets[changeSetId];
  
  if (!changeSet) {
    throw new Error(`Change set with ID ${changeSetId} not found`);
  }
  
  // Validate before applying
  const validation = await validateChangeSet(changeSetId);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }
  
  changeSet.status = "applying";
  const errors: string[] = [];
  
  // Sort changes by dependency order
  const sortedChanges = sortChangesByDependencies(changeSet.changes);
  
  // Apply each change
  for (const change of sortedChanges) {
    try {
      switch (change.type) {
        case "create":
          if (!change.content) {
            throw new Error("No content provided for create operation");
          }
          
          const createResult = await writeFile(change.filePath, change.content, {
            createBackup: false, // No need for backup on create
          });
          
          if (!createResult.success) {
            throw new Error(createResult.error);
          }
          break;
          
        case "modify":
          if (!change.content) {
            throw new Error("No content provided for modify operation");
          }
          
          const modifyResult = await writeFile(change.filePath, change.content, {
            createBackup: true,
          });
          
          if (!modifyResult.success) {
            throw new Error(modifyResult.error);
          }
          break;
          
        case "delete":
          // Ensure we have the original content for rollback
          if (!change.originalContent) {
            const readResult = await readFile(change.filePath);
            if (readResult.success && readResult.content) {
              change.originalContent = readResult.content;
            }
          }
          
          // Create a backup before deletion
          const backupPath = `${change.filePath}.backup.${Date.now()}`;
          await fs.copyFile(change.filePath, backupPath);
          
          // Delete the file
          await fs.unlink(change.filePath);
          break;
      }
      
      change.status = "applied";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      change.status = "failed";
      change.error = errorMessage;
      errors.push(`Failed to apply change ${change.id} (${change.filePath}): ${errorMessage}`);
      
      // Stop processing on first error
      break;
    }
  }
  
  // If any changes failed, roll back all applied changes
  if (errors.length > 0) {
    await rollbackChangeSet(changeSetId);
    changeSet.status = "failed";
    return { success: false, errors };
  }
  
  changeSet.status = "completed";
  changeSet.completedAt = new Date();
  return { success: true, errors: [] };
}

/**
 * Roll back all applied changes in a change set in reverse order
 */
export async function rollbackChangeSet(changeSetId: string): Promise<{ success: boolean; errors: string[] }> {
  const changeSet = changeSets[changeSetId];
  
  if (!changeSet) {
    throw new Error(`Change set with ID ${changeSetId} not found`);
  }
  
  const errors: string[] = [];
  
  // Get applied changes and reverse the order for rollback
  const appliedChanges = changeSet.changes
    .filter(change => change.status === "applied")
    .reverse();
  
  for (const change of appliedChanges) {
    try {
      switch (change.type) {
        case "create":
          // For created files, just delete them
          await fs.unlink(change.filePath);
          break;
          
        case "modify":
          // For modified files, restore original content
          if (change.originalContent) {
            await writeFile(change.filePath, change.originalContent, {
              createBackup: false, // No need for backup during rollback
            });
          } else {
            throw new Error("Original content not available for rollback");
          }
          break;
          
        case "delete":
          // For deleted files, restore from original content
          if (change.originalContent) {
            // Ensure the directory exists
            await fs.mkdir(path.dirname(change.filePath), { recursive: true });
            await writeFile(change.filePath, change.originalContent, {
              createBackup: false,
            });
          } else {
            throw new Error("Original content not available for rollback");
          }
          break;
      }
      
      change.status = "rolled-back";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to roll back change ${change.id} (${change.filePath}): ${errorMessage}`);
      // Continue rolling back other changes even if one fails
    }
  }
  
  changeSet.status = "rolled-back";
  return { success: errors.length === 0, errors };
}

/**
 * Get all change sets
 */
export function getChangeSets(): ChangeSet[] {
  return Object.values(changeSets);
}

/**
 * Get a specific change set by ID
 */
export function getChangeSet(changeSetId: string): ChangeSet | undefined {
  return changeSets[changeSetId];
}

/**
 * Find circular dependencies in a dependency graph
 * @param graph Dependency graph as an adjacency list
 * @returns Array of node IDs forming a cycle, or empty array if no cycles
 */
function findCircularDependencies(graph: Record<string, string[]>): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];
  
  function dfs(nodeId: string): string[] {
    if (recursionStack.has(nodeId)) {
      return [...path.slice(path.indexOf(nodeId)), nodeId];
    }
    
    if (visited.has(nodeId)) {
      return [];
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const neighbors = graph[nodeId] || [];
    for (const neighbor of neighbors) {
      const cycle = dfs(neighbor);
      if (cycle.length > 0) {
        return cycle;
      }
    }
    
    recursionStack.delete(nodeId);
    path.pop();
    return [];
  }
  
  for (const nodeId of Object.keys(graph)) {
    const cycle = dfs(nodeId);
    if (cycle.length > 0) {
      return cycle;
    }
  }
  
  return [];
}

/**
 * Sort changes by dependency order (topological sort)
 */
function sortChangesByDependencies(changes: PlannedChange[]): PlannedChange[] {
  // Build dependency graph
  const graph: Record<string, string[]> = {};
  changes.forEach(change => {
    graph[change.id] = change.dependencies;
  });
  
  // Map of change IDs to changes
  const changeMap: Record<string, PlannedChange> = {};
  changes.forEach(change => {
    changeMap[change.id] = change;
  });
  
  // Perform topological sort
  const visited = new Set<string>();
  const sorted: PlannedChange[] = [];
  
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    
    visited.add(nodeId);
    
    const dependencies = graph[nodeId] || [];
    for (const depId of dependencies) {
      visit(depId);
    }
    
    sorted.push(changeMap[nodeId]);
  }
  
  changes.forEach(change => {
    visit(change.id);
  });
  
  return sorted;
}