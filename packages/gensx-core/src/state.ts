import type { ProgressEvent } from "./workflow-context.js";

import { getCurrentContext } from "./context.js";

// JSON patch operation for state deltas
export interface JSONPatchOperation {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: unknown;
  from?: string;
}

// Extract the state update event type from ProgressEvent
export type StateUpdateEvent = Extract<ProgressEvent, { type: "state-update" }>;

// Base state manager interface (no broadcasting)
export interface StateManager<T> {
  get(): T;
  update(updater: (state: T) => T): void;
  set(newState: T): void;
  reset(): void;
}

// Extended state manager with attachment capabilities for workflow state
export interface BroadcastingStateManager<T> extends StateManager<T> {
  // State attachment for composition - will be implemented with proper attachment methods
  attach?<K extends keyof T>(property: K, childState: StateManager<T[K]>): void;
}

// Global state registry to manage multiple named states
const stateRegistry = new Map<
  string,
  {
    currentState: unknown;
    initialState: unknown;
    manager: StateManager<unknown>;
  }
>();

// Global broadcasting state registry (for workflow states)
const broadcastingStateRegistry = new Map<
  string,
  {
    currentState: unknown;
    initialState: unknown;
    manager: BroadcastingStateManager<unknown>;
  }
>();

/**
 * Creates a basic state manager (no broadcasting) for component use
 */
export function createStateManager<T>(
  name: string,
  initialState: T,
): StateManager<T> {
  // Create a unique key to avoid conflicts
  const key = `${name}-${Date.now()}-${Math.random()}`;

  const currentState = deepClone(initialState);
  const stateEntry = {
    currentState,
    initialState: deepClone(initialState),
    manager: undefined as unknown as StateManager<T>,
  };

  const manager: StateManager<T> = {
    get(): T {
      return deepClone(stateEntry.currentState);
    },

    update(updater: (state: T) => T): void {
      const currentClone = deepClone(stateEntry.currentState);
      const newState = updater(currentClone);
      stateEntry.currentState = newState;
      // No broadcasting for component state
    },

    set(newState: T): void {
      stateEntry.currentState = newState;
      // No broadcasting for component state
    },

    reset(): void {
      const resetState = deepClone(stateEntry.initialState);
      stateEntry.currentState = resetState;
      // No broadcasting for component state
    },
  };

  stateEntry.manager = manager;
  stateRegistry.set(key, stateEntry);

  return manager;
}

/**
 * Creates or retrieves a named broadcasting state manager for workflow use
 * This is the original state function that emits progress events
 */
export function state<T>(
  name: string,
  initialState?: T,
): BroadcastingStateManager<T> {
  // If manager already exists, return it
  const existing = broadcastingStateRegistry.get(name);
  if (existing) {
    return existing.manager as BroadcastingStateManager<T>;
  }

  // Initialize state
  const currentState = initialState ?? ({} as T);
  const stateEntry = {
    currentState: deepClone(currentState),
    initialState: deepClone(currentState),
    manager: undefined as unknown as BroadcastingStateManager<T>,
  };

  const manager: BroadcastingStateManager<T> = {
    get(): T {
      return deepClone(stateEntry.currentState);
    },

    update(updater: (state: T) => T): void {
      const currentClone = deepClone(stateEntry.currentState);
      const newState = updater(currentClone);
      updateStateWithDelta(name, stateEntry.currentState, newState);
      stateEntry.currentState = newState;
    },

    set(newState: T): void {
      updateStateWithDelta(name, stateEntry.currentState, newState);
      stateEntry.currentState = newState;
    },

    reset(): void {
      const resetState = deepClone(stateEntry.initialState);
      updateStateWithDelta(name, stateEntry.currentState, resetState);
      stateEntry.currentState = resetState;
    },
  } as BroadcastingStateManager<T>;

  // Add attachment capabilities (stub for now - will implement later)
  // This would be populated with actual attachment methods for each property

  stateEntry.manager = manager;
  broadcastingStateRegistry.set(name, stateEntry);

  // Emit initial state for broadcasting state managers
  emitStateUpdate(name, [], stateEntry.currentState);

  return manager;
}

/**
 * Computes JSON patch delta and emits state update event
 */
function updateStateWithDelta<T>(
  stateName: string,
  oldState: T,
  newState: T,
): void {
  const patch = computeJSONPatch(oldState, newState);
  emitStateUpdate(stateName, patch, newState);
}

/**
 * Emits state update event via the progress listener
 */
function emitStateUpdate(
  stateName: string,
  patch: JSONPatchOperation[],
  fullState: unknown,
): void {
  try {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();

    const event: StateUpdateEvent = {
      type: "state-update",
      stateName,
      patch,
      fullState: patch.length === 0 ? fullState : undefined, // Include full state for initial update
    };

    workflowContext.progressListener(event);
  } catch (error) {
    console.error(`Failed to emit state update for ${stateName}:`, error);
  }
}

/**
 * Computes JSON patch operations between old and new state
 * This is a simplified implementation - you might want to use a library like 'fast-json-patch'
 */
function computeJSONPatch<T>(oldState: T, newState: T): JSONPatchOperation[] {
  const patches: JSONPatchOperation[] = [];

  if (oldState === newState) {
    return patches;
  }

  // For simplicity, we'll do a full replace if the root objects differ significantly
  // A more sophisticated implementation would compute granular patches
  if (JSON.stringify(oldState) !== JSON.stringify(newState)) {
    patches.push({
      op: "replace",
      path: "",
      value: newState,
    });
  }

  return patches;
}

/**
 * Deep clone utility to ensure immutability
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map((item: unknown) => deepClone(item)) as unknown as T;
  }

  if (typeof obj === "object") {
    const cloned = {} as Record<string, unknown>;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone((obj as Record<string, unknown>)[key]);
      }
    }
    return cloned as T;
  }

  return obj;
}

/**
 * Get all current state entries (useful for debugging)
 */
export function getAllStates(): Record<string, unknown> {
  const states: Record<string, unknown> = {};
  for (const [name, entry] of stateRegistry.entries()) {
    states[name] = entry.currentState;
  }
  for (const [name, entry] of broadcastingStateRegistry.entries()) {
    states[name] = entry.currentState;
  }
  return states;
}

/**
 * Clear all state (useful for testing)
 */
export function clearAllStates(): void {
  stateRegistry.clear();
  broadcastingStateRegistry.clear();
}

// BroadcastingStateManager is already exported above in the interface declaration
