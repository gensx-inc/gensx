import { resolveDeep } from "./resolve";
import { Args, Context, GsxComponent } from "./types";
import {
  createWorkflowContext,
  WORKFLOW_CONTEXT_SYMBOL,
  WorkflowExecutionContext,
} from "./workflow-context";

type WorkflowContext = Record<symbol, unknown>;

// Create unique symbols for each context
let contextCounter = 0;
function createContextSymbol() {
  return Symbol.for(`gensx.context.${contextCounter++}`);
}

export function createContext<T>(defaultValue: T): Context<T> {
  const contextSymbol = createContextSymbol();

  const Provider = (props: Args<{ value: T }, ExecutionContext>) => {
    return wrapWithFramework(() => {
      const currentContext = getCurrentContext();

      return Promise.resolve(
        currentContext.withContext({ [contextSymbol]: props.value }),
      );
    });
  };

  const context = {
    __type: "Context" as const,
    defaultValue,
    symbol: contextSymbol,
    Provider: Provider as unknown as GsxComponent<
      { value: T },
      ExecutionContext
    >,
  };

  return context;
}

export function useContext<T>(context: Context<T>): T {
  const executionContext = getCurrentContext();
  const value = executionContext.get(context.symbol);

  if (value === undefined) {
    return context.defaultValue;
  }

  return value as T;
}

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
  ) {
    if (!this.context[WORKFLOW_CONTEXT_SYMBOL]) {
      this.context[WORKFLOW_CONTEXT_SYMBOL] = createWorkflowContext();
    }
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

  getCurrentNodeId(): string | undefined {
    return this.get(CURRENT_NODE_SYMBOL) as string | undefined;
  }

  withCurrentNode<T>(nodeId: string, fn: () => Promise<T>): Promise<T> {
    return withContext(
      this.withContext({ [CURRENT_NODE_SYMBOL]: nodeId }),
      wrapWithFramework(fn),
    );
  }
}

// Try to import AsyncLocalStorage if available (Node.js environment)
let AsyncLocalStorage: (new <T>() => AsyncLocalStorageType<T>) | undefined;
let contextStorage: AsyncLocalStorageType<ExecutionContext> | null = null;
const configureAsyncLocalStorage = (async () => {
  try {
    const asyncHooksModule = await import("node:async_hooks");
    AsyncLocalStorage = asyncHooksModule.AsyncLocalStorage;
    contextStorage = new AsyncLocalStorage<ExecutionContext>();
  } catch {
    // This is probably an environment without async_hooks, so just use global state and warn the developer
    console.warn(
      "Running in an environment without async_hooks - using global context state. This will only cause issues if concurrent workflows are executed simultaneously.",
    );
  }
})();

const rootContext = new ExecutionContext({});

// Private fallback state
let globalContext = rootContext;

// Add type for framework functions
type FrameworkFunction<T> = (() => Promise<T>) & {
  __gsxFramework: boolean;
};

function wrapWithFramework<T>(fn: () => Promise<T>): FrameworkFunction<T> {
  const wrapper = async () => fn();
  (wrapper as FrameworkFunction<T>).__gsxFramework = true;
  return wrapper as FrameworkFunction<T>;
}

// Update contextManager implementation
const contextManager = {
  getCurrentContext(): ExecutionContext {
    if (contextStorage) {
      const store = contextStorage.getStore();
      return store ?? rootContext;
    }
    return globalContext;
  },

  run<T>(context: ExecutionContext, fn: () => Promise<T>): Promise<T> {
    const wrappedFn = wrapWithFramework(fn);
    if (contextStorage) {
      return contextStorage.run(context, wrappedFn);
    }
    const prevContext = globalContext;
    globalContext = context;
    try {
      return wrappedFn();
    } finally {
      globalContext = prevContext;
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
    const result = await resolveDeep(wrapWithFramework(fn));
    return result as T;
  });
}

// Export for testing or advanced use cases
export function getCurrentContext(): ExecutionContext {
  return contextManager.getCurrentContext();
}
