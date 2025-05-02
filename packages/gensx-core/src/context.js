import { resolveDeep } from "./resolve.js";
import { createWorkflowContext, WORKFLOW_CONTEXT_SYMBOL, } from "./workflow-context.js";
// Create unique symbols for each context
let contextCounter = 0;
function createContextSymbol() {
    return Symbol.for(`gensx.context.${contextCounter++}`);
}
// Context now returns a fluent provider that can be used with our new API
export function createContext(defaultValue) {
    const contextSymbol = createContextSymbol();
    return {
        __type: "Context",
        defaultValue,
        symbol: contextSymbol,
        // Create a fluent provider for this context
        Provider: (value) => {
            const provider = {
                value,
                with: async (fn) => {
                    const currentContext = getCurrentContext();
                    const executionContext = currentContext.withContext({
                        [contextSymbol]: value,
                    });
                    return withContext(executionContext, async () => {
                        const result = await resolveDeep(fn());
                        return result;
                    });
                },
            };
            return provider;
        },
    };
}
export function useContext(context) {
    const executionContext = getCurrentContext();
    const value = executionContext.get(context.symbol);
    if (!value) {
        return context.defaultValue;
    }
    return value;
}
export const CURRENT_NODE_SYMBOL = Symbol.for("gensx.currentNode");
export class ExecutionContext {
    constructor(context, parent, onComplete) {
        var _a;
        this.context = context;
        this.parent = parent;
        this.onComplete = onComplete;
        (_a = this.context)[WORKFLOW_CONTEXT_SYMBOL] ?? (_a[WORKFLOW_CONTEXT_SYMBOL] = createWorkflowContext());
    }
    withContext(newContext, onComplete) {
        if (Object.getOwnPropertySymbols(newContext).length === 0) {
            return this;
        }
        // Create a new context that inherits from the current one
        const mergedContext = {};
        for (const key of Object.getOwnPropertySymbols(this.context)) {
            mergedContext[key] = this.context[key];
        }
        // Override with new values
        for (const key of Object.getOwnPropertySymbols(newContext)) {
            mergedContext[key] = newContext[key];
        }
        return new ExecutionContext(mergedContext, this, onComplete);
    }
    get(key) {
        if (key in this.context) {
            return this.context[key];
        }
        return this.parent?.get(key);
    }
    getWorkflowContext() {
        return this.get(WORKFLOW_CONTEXT_SYMBOL);
    }
    getCurrentNodeId() {
        return this.get(CURRENT_NODE_SYMBOL);
    }
    withCurrentNode(nodeId, fn) {
        return withContext(this.withContext({ [CURRENT_NODE_SYMBOL]: nodeId }), wrapWithFramework(fn));
    }
}
// Create a global symbol for contextStorage
const CONTEXT_STORAGE_SYMBOL = Symbol.for("gensx.contextStorage");
const globalObj = typeof globalThis !== "undefined"
    ? globalThis
    : typeof window !== "undefined"
        ? window
        : typeof global !== "undefined"
            ? global
            : typeof self !== "undefined"
                ? self
                : {};
// Initialize the global storage if it doesn't exist
globalObj[CONTEXT_STORAGE_SYMBOL] ?? (globalObj[CONTEXT_STORAGE_SYMBOL] = null);
// Try to import AsyncLocalStorage if available (Node.js environment)
let AsyncLocalStorage;
const configureAsyncLocalStorage = (async () => {
    try {
        const asyncHooksModule = await import("node:async_hooks");
        AsyncLocalStorage = asyncHooksModule.AsyncLocalStorage;
        globalObj[CONTEXT_STORAGE_SYMBOL] =
            new AsyncLocalStorage();
    }
    catch {
        // This is probably an environment without async_hooks, so just use global state and warn the developer
        console.warn("Running in an environment without async_hooks - using global context state. This will only cause issues if concurrent workflows are executed simultaneously.");
    }
})();
const rootContext = new ExecutionContext({});
// Create a global symbol for the fallback context
const GLOBAL_CONTEXT_SYMBOL = Symbol.for("gensx.globalContext");
// Initialize the global fallback context if it doesn't exist
globalObj[GLOBAL_CONTEXT_SYMBOL] ?? (globalObj[GLOBAL_CONTEXT_SYMBOL] = rootContext);
// Helper to get/set the global context
const getGlobalContext = () => globalObj[GLOBAL_CONTEXT_SYMBOL];
const setGlobalContext = (context) => {
    globalObj[GLOBAL_CONTEXT_SYMBOL] = context;
};
function wrapWithFramework(fn) {
    const wrapper = async () => fn();
    wrapper.__gsxFramework = true;
    return wrapper;
}
// Update contextManager implementation
const contextManager = {
    getCurrentContext() {
        const storage = globalObj[CONTEXT_STORAGE_SYMBOL];
        if (storage) {
            const store = storage.getStore();
            return store ?? rootContext;
        }
        return getGlobalContext();
    },
    run(context, fn) {
        const wrappedFn = wrapWithFramework(fn);
        const storage = globalObj[CONTEXT_STORAGE_SYMBOL];
        if (storage) {
            return storage.run(context, wrappedFn);
        }
        const prevContext = getGlobalContext();
        setGlobalContext(context);
        try {
            return wrappedFn();
        }
        finally {
            setGlobalContext(prevContext);
        }
    },
};
// Update withContext to use contextManager.run
export async function withContext(context, fn) {
    await configureAsyncLocalStorage;
    return contextManager.run(context, async () => {
        const result = await resolveDeep(wrapWithFramework(fn));
        return result;
    });
}
// Export for testing or advanced use cases
export function getCurrentContext() {
    return contextManager.getCurrentContext();
}
