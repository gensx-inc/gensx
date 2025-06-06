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

// State manager instance
export interface StateManager<T> {
  get(): T;
  update(updater: (state: T) => T): void;
  set(newState: T): void;
  reset(): void;
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

// Mutex for serializing state updates
const updateMutex = new Map<string, Promise<void>>();

/**
 * Creates or retrieves a named state manager with delta-based updates
 * Usage: const state = gensx.state<ChatApp>("chatState");
 */
export function state<T>(name: string, initialState?: T): StateManager<T> {
  // If manager already exists, return it
  const existing = stateRegistry.get(name);
  if (existing) {
    return existing.manager as StateManager<T>;
  }

  // Initialize state
  const currentState = initialState ?? ({} as T);
  const stateEntry = {
    currentState: deepClone(currentState),
    initialState: deepClone(currentState),
    manager: undefined as unknown as StateManager<T>,
  };

  const manager: StateManager<T> = {
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
  };

  stateEntry.manager = manager;
  stateRegistry.set(name, stateEntry);

  // Emit initial state
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
  return states;
}

/**
 * Clear all state (useful for testing)
 */
export function clearAllStates(): void {
  stateRegistry.clear();
  updateMutex.clear();
}
