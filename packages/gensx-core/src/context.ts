import { ExecutionNode } from "./checkpoint-types.js";
import {
  createWorkflowContext,
  InputRequest,
  WORKFLOW_CONTEXT_SYMBOL,
  WorkflowExecutionContext,
} from "./workflow-context.js";
import { WorkflowMessageListener } from "./workflow-state.js";

type WorkflowContext = Record<symbol, unknown>;

// Define AsyncLocalStorage type based on Node.js definitions
interface AsyncLocalStorageType<T> {
  disable(): void;
  getStore(): T | undefined;
  run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R;
  enterWith(store: T): void;
}

export const CURRENT_NODE_SYMBOL = Symbol.for("gensx.currentNode");

// TODO(jeremy): I think this is due for a refactor now that we have simplified the context and provider stuff.
export class ExecutionContext {
  constructor(
    public context: WorkflowContext,
    private parent?: ExecutionContext,
    {
      messageListener,
      onRequestInput,
      onRestoreCheckpoint,
      checkpoint,
      executionScope,
    }: {
      messageListener?: WorkflowMessageListener;
      onRequestInput?: (inputRequest: InputRequest) => Promise<void>;
      onRestoreCheckpoint?: (
        node: ExecutionNode,
        feedback: unknown,
      ) => Promise<void>;
      checkpoint?: ExecutionNode;
      executionScope?: Record<string, unknown>;
    } = {},
  ) {
    this.context[WORKFLOW_CONTEXT_SYMBOL] ??= createWorkflowContext({
      onMessage:
        messageListener ??
        this.parent?.getWorkflowContext().sendWorkflowMessage,
      onRequestInput:
        onRequestInput ?? this.parent?.getWorkflowContext().onRequestInput,
      onRestoreCheckpoint:
        onRestoreCheckpoint ??
        this.parent?.getWorkflowContext().onRestoreCheckpoint,
      checkpoint,
      executionScope:
        executionScope ??
        this.parent?.getWorkflowContext().executionScope ??
        {},
    });
  }

  init() {
    return contextManager.init();
  }

  withContext(newContext: Partial<WorkflowContext>): ExecutionContext {
    if (Object.getOwnPropertySymbols(newContext).length === 0) {
      return this;
    }

    // Create a new context that inherits from the current one
    const mergedContext = {} as WorkflowContext;
    for (const key of Object.getOwnPropertySymbols(this.context)) {
      mergedContext[key] = this.context[key];
    }
    // Override with new values
    for (const key of Object.getOwnPropertySymbols(newContext)) {
      mergedContext[key] = newContext[key];
    }
    return new ExecutionContext(mergedContext, this);
  }

  get<K extends keyof WorkflowContext>(key: K): WorkflowContext[K] | undefined {
    if (key in this.context) {
      return this.context[key];
    }
    return this.parent?.get(key);
  }

  getWorkflowContext(): WorkflowExecutionContext {
    return this.get(WORKFLOW_CONTEXT_SYMBOL) as WorkflowExecutionContext;
  }

  getCurrentNode(): ExecutionNode | undefined {
    return this.get(CURRENT_NODE_SYMBOL) as ExecutionNode | undefined;
  }

  withCurrentNode<T>(node: ExecutionNode, fn: () => T): T {
    return withContext(this.withContext({ [CURRENT_NODE_SYMBOL]: node }), fn);
  }
}

// Create a global symbol for contextStorage
const CONTEXT_STORAGE_SYMBOL = Symbol.for("gensx.contextStorage");

// Get the global object in a cross-platform way
declare const globalThis: Record<symbol, unknown>;
declare const window: Record<symbol, unknown>;
declare const global: Record<symbol, unknown>;
declare const self: Record<symbol, unknown>;

const globalObj: Record<symbol, unknown> =
  typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
      ? window
      : typeof global !== "undefined"
        ? global
        : typeof self !== "undefined"
          ? self
          : {};

// Initialize the global storage if it doesn't exist
globalObj[CONTEXT_STORAGE_SYMBOL] ??= null;

// Try to import AsyncLocalStorage if available (Node.js environment)
let AsyncLocalStorage:
  | {
      new <T>(): AsyncLocalStorageType<T>;
      snapshot: () => (fn: (...args: unknown[]) => unknown) => unknown;
    }
  | undefined;

const configureAsyncLocalStorage = (async () => {
  try {
    const asyncHooksModule = await import("node:async_hooks");
    AsyncLocalStorage = asyncHooksModule.AsyncLocalStorage;
    globalObj[CONTEXT_STORAGE_SYMBOL] =
      new AsyncLocalStorage<ExecutionContext>();
  } catch {
    // This is probably an environment without async_hooks, so just use global state and warn the developer
    console.warn(
      "Running in an environment without async_hooks - using global context state. This will only cause issues if concurrent workflows are executed simultaneously.",
    );
  }
})();

let rootContextRef: { context: ExecutionContext | undefined } = {
  context: undefined,
};

// Create a global symbol for the fallback context
const GLOBAL_CONTEXT_SYMBOL = Symbol.for("gensx.globalContext");

// Initialize the global fallback context if it doesn't exist
globalObj[GLOBAL_CONTEXT_SYMBOL] ??= rootContextRef;

// Helper to get/set the global context
const getGlobalContext = (): ExecutionContext => {
  const context = (
    globalObj[GLOBAL_CONTEXT_SYMBOL] as {
      context: ExecutionContext | undefined;
    }
  ).context;
  if (context === undefined) {
    const newContext = new ExecutionContext({});
    setGlobalContext(newContext);
    return newContext;
  }
  return context;
};

const setGlobalContext = (context: ExecutionContext): void => {
  (globalObj[GLOBAL_CONTEXT_SYMBOL] as { context: ExecutionContext }).context =
    context;
};

// Update contextManager implementation
const contextManager = {
  async init() {
    await configureAsyncLocalStorage;
    rootContextRef.context = new ExecutionContext({});
  },

  getCurrentContext(): ExecutionContext {
    const storage = globalObj[
      CONTEXT_STORAGE_SYMBOL
    ] as AsyncLocalStorageType<ExecutionContext> | null;
    if (storage) {
      const store = storage.getStore();
      return store ?? getGlobalContext();
    }
    return getGlobalContext();
  },

  run<T>(context: ExecutionContext, fn: () => T): T {
    const storage = globalObj[
      CONTEXT_STORAGE_SYMBOL
    ] as AsyncLocalStorageType<ExecutionContext> | null;
    if (storage) {
      return storage.run(context, fn);
    }
    const prevContext = getGlobalContext();
    setGlobalContext(context);
    try {
      return fn();
    } finally {
      setGlobalContext(prevContext);
    }
  },

  getContextSnapshot(): RunInContext {
    const storage = globalObj[
      CONTEXT_STORAGE_SYMBOL
    ] as AsyncLocalStorageType<ExecutionContext> | null;
    if (storage) {
      return AsyncLocalStorage?.snapshot() as RunInContext;
    }
    const context = getGlobalContext();
    return ((fn: () => unknown) => {
      return contextManager.run(context, fn);
    }) as RunInContext;
  },
};

export type RunInContext = <T>(fn: () => T) => T;

// Update withContext to use contextManager.run
export function withContext<T>(context: ExecutionContext, fn: () => T): T {
  return contextManager.run(context, fn);
}

// Export for testing or advanced use cases
export function getCurrentContext(): ExecutionContext {
  return contextManager.getCurrentContext();
}

export function getContextSnapshot(): RunInContext {
  return contextManager.getContextSnapshot();
}

export function getCurrentNodeCheckpointManager() {
  const context = getCurrentContext();
  const workflowContext = context.getWorkflowContext();
  const { checkpointManager } = workflowContext;
  const currentNode = context.getCurrentNode();

  if (!currentNode) {
    console.warn("[GenSX] No current node found.");
    return {
      node: undefined,
      completeNode: () => {
        // noop
        console.warn("[GenSX] Cannot complete node - no current node found.");
      },
      updateNode: () => {
        // noop
        console.warn("[GenSX] Cannot update node - no current node found.");
      },
      addMetadata: () => {
        // noop
        console.warn("[GenSX] Cannot add metadata - no current node found.");
      },
    };
  }

  return {
    node: currentNode,
    completeNode: (output: unknown, opts: { wrapInPromise?: boolean } = {}) => {
      checkpointManager.completeNode(currentNode, output, opts);
    },
    updateNode: (updates: Partial<ExecutionNode>) => {
      checkpointManager.updateNode(currentNode, updates);
    },
    addMetadata: (metadata: Record<string, unknown>) => {
      checkpointManager.addMetadata(currentNode, metadata);
    },
  };
}
