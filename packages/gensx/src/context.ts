import { resolveDeep } from "./resolve";
import { ExecutableValue, type WorkflowContext } from "./types";

// Define AsyncLocalStorage type based on Node.js definitions
interface AsyncLocalStorageType<T> {
  disable(): void;
  getStore(): T | undefined;
  run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R;
  enterWith(store: T): void;
}

export class ExecutionContext {
  constructor(
    public context: WorkflowContext,
    private parent?: ExecutionContext,
  ) {}

  withContext(context: Partial<WorkflowContext>): ExecutionContext {
    return new ExecutionContext(context, this);
  }

  fork(): ExecutionContext {
    return new ExecutionContext({ ...this.context }, this);
  }

  get<K extends keyof WorkflowContext>(key: K): WorkflowContext[K] | undefined {
    if (key in this.context) {
      return this.context[key];
    }
    return this.parent?.get(key);
  }
}

// Create a closure for context management
const contextManager = (() => {
  // Try to import AsyncLocalStorage if available (Node.js environment)
  let AsyncLocalStorage: { new <T>(): AsyncLocalStorageType<T> } | undefined;
  try {
    const asyncHooks = require("node:async_hooks");
    AsyncLocalStorage = asyncHooks.AsyncLocalStorage;
  } catch {
    // AsyncLocalStorage not available (browser environment)
    console.warn(
      "Running in an environment without async_hooks - using global context state. This will only cause issues if concurrent workflows are executed simultaneously.",
    );
  }

  const rootContext = new ExecutionContext({});
  const storage = AsyncLocalStorage
    ? new AsyncLocalStorage<ExecutionContext>()
    : null;

  // Private fallback state
  let globalContext = rootContext;

  return {
    getCurrentContext(): ExecutionContext {
      if (storage) {
        return storage.getStore() || rootContext;
      }
      return globalContext;
    },

    run<T>(context: ExecutionContext, fn: () => Promise<T>): Promise<T> {
      if (storage) {
        return storage.run(context, fn);
      }
      const prevContext = globalContext;
      globalContext = context;
      try {
        return fn();
      } finally {
        globalContext = prevContext;
      }
    },
  };
})();

// Helper to run code with a specific context
export async function withContext<T>(
  context: Partial<WorkflowContext>,
  fn: ExecutableValue,
): Promise<T> {
  const prevContext = contextManager.getCurrentContext();
  const newContext =
    Object.keys(context).length > 0
      ? prevContext.withContext(context)
      : prevContext;

  return contextManager.run(newContext, async () => {
    const result = await resolveDeep(fn);
    return result as T;
  });
}

// Export for testing or advanced use cases
export function getCurrentContext(): ExecutionContext {
  return contextManager.getCurrentContext();
}
