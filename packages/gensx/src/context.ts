import { resolveDeep } from "./resolve";
import { ExecutableValue, type WorkflowContext } from "./types";

// Define AsyncLocalStorage type based on Node.js definitions
interface AsyncLocalStorageType<T> {
  disable(): void;
  getStore(): T | undefined;
  run<R>(store: T, callback: (...args: unknown[]) => R, ...args: unknown[]): R;
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

// Try to import AsyncLocalStorage if available (Node.js environment)
let AsyncLocalStorage: (new <T>() => AsyncLocalStorageType<T>) | undefined;
let storage: AsyncLocalStorageType<ExecutionContext> | null = null;
import("node:async_hooks")
  .then(asyncHooksModule => {
    AsyncLocalStorage = asyncHooksModule.AsyncLocalStorage;
    storage = new AsyncLocalStorage<ExecutionContext>();
  })
  .catch(() => {
    // AsyncLocalStorage not available (browser environment)
    console.warn(
      "Running in an environment without async_hooks - using global context state. This will only cause issues if concurrent workflows are executed simultaneously.",
    );
  });

// Create a closure for context management
const contextManager = (() => {
  const rootContext = new ExecutionContext({});

  // Private fallback state
  let globalContext = rootContext;

  return {
    getCurrentContext(): ExecutionContext {
      if (storage) {
        return storage.getStore() ?? rootContext;
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
