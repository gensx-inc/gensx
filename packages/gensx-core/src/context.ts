import {
  createWorkflowContext,
  WORKFLOW_CONTEXT_SYMBOL,
  WorkflowExecutionContext,
} from "./workflow-context.js";

type WorkflowContext = Record<symbol, unknown>;

// Define AsyncLocalStorage type based on Node.js definitions
interface AsyncLocalStorageType<T> {
  disable(): void;
  getStore(): T | undefined;
  run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R;
  enterWith(store: T): void;
}

export const CURRENT_NODE_SYMBOL = Symbol.for("gensx.currentNode");

export class ExecutionContext {
  constructor(
    public context: WorkflowContext,
    private parent?: ExecutionContext,
    public onComplete?: () => Promise<void> | void,
  ) {
    this.context[WORKFLOW_CONTEXT_SYMBOL] ??= createWorkflowContext();
  }

  withContext(
    newContext: Partial<WorkflowContext>,
    onComplete?: () => Promise<void> | void,
  ): ExecutionContext {
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
    return new ExecutionContext(mergedContext, this, onComplete);
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

  getCurrentNodeId(): string | undefined {
    return this.get(CURRENT_NODE_SYMBOL) as string | undefined;
  }

  withCurrentNode<T>(nodeId: string, fn: () => Promise<T>): Promise<T> {
    return withContext(this.withContext({ [CURRENT_NODE_SYMBOL]: nodeId }), fn);
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
let AsyncLocalStorage: (new <T>() => AsyncLocalStorageType<T>) | undefined;

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

const rootContext = new ExecutionContext({});

// Create a global symbol for the fallback context
const GLOBAL_CONTEXT_SYMBOL = Symbol.for("gensx.globalContext");

// Initialize the global fallback context if it doesn't exist
globalObj[GLOBAL_CONTEXT_SYMBOL] ??= rootContext;

// Helper to get/set the global context
const getGlobalContext = (): ExecutionContext =>
  globalObj[GLOBAL_CONTEXT_SYMBOL] as ExecutionContext;
const setGlobalContext = (context: ExecutionContext): void => {
  globalObj[GLOBAL_CONTEXT_SYMBOL] = context;
};

// Update contextManager implementation
const contextManager = {
  getCurrentContext(): ExecutionContext {
    const storage = globalObj[
      CONTEXT_STORAGE_SYMBOL
    ] as AsyncLocalStorageType<ExecutionContext> | null;
    if (storage) {
      const store = storage.getStore();
      return store ?? rootContext;
    }
    return getGlobalContext();
  },

  run<T>(context: ExecutionContext, fn: () => Promise<T>): Promise<T> {
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
};

// Update withContext to use contextManager.run
export async function withContext<T>(
  context: ExecutionContext,
  fn: () => Promise<T>,
): Promise<T> {
  await configureAsyncLocalStorage;
  return contextManager.run(context, async () => {
    const result = await fn();
    return result as T;
  });
}

// Export for testing or advanced use cases
export function getCurrentContext(): ExecutionContext {
  return contextManager.getCurrentContext();
}
