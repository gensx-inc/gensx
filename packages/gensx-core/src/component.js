import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;
import { getCurrentContext, withContext } from "./context.js";
import { ExecutionContext } from "./context.js";
import { resolveDeep } from "./resolve.js";
import { isStreamable } from "./stream.js";
import { createWorkflowContext } from "./workflow-context.js";
export const STREAMING_PLACEHOLDER = "[streaming in progress]";
// Core component function implementation
function createComponent(name, fn, defaultOpts) {
    // Create the base execution function
    async function executeComponent(props) {
        // Validate props
        if (typeof props !== "object") {
            throw new Error(`Component ${name} received non-object props.`);
        }
        const context = getCurrentContext();
        const workflowContext = context.getWorkflowContext();
        const { checkpointManager } = workflowContext;
        const currentNodeId = context.getCurrentNodeId();
        // Merge component opts with unique secrets
        const mergedOpts = {
            ...defaultOpts,
            ...props.componentOpts,
            ...{
                ...defaultOpts?.metadata,
                ...props.componentOpts?.metadata,
            },
            secretProps: Array.from(new Set([
                ...(defaultOpts?.secretProps ?? []),
                ...(props.componentOpts?.secretProps ?? []),
            ])),
            secretOutputs: defaultOpts?.secretOutputs ?? props.componentOpts?.secretOutputs,
        };
        // Create checkpoint node for this component execution
        const nodeId = checkpointManager.addNode({
            componentName: props.componentOpts?.name ?? name,
            props: Object.fromEntries(Object.entries(props).filter(([key]) => key !== "componentOpts")),
            componentOpts: mergedOpts,
        }, currentNodeId);
        try {
            const result = await context.withCurrentNode(nodeId, async () => {
                const { componentOpts, ...componentProps } = props;
                const fnResult = await fn(componentProps);
                return resolveDeep(fnResult);
            });
            // Complete the checkpoint node with the result
            checkpointManager.completeNode(nodeId, result);
            return result;
        }
        catch (error) {
            // Record error in checkpoint
            if (error instanceof Error) {
                checkpointManager.addMetadata(nodeId, { error: serializeError(error) });
                checkpointManager.completeNode(nodeId, undefined);
            }
            throw error;
        }
    }
    // Create the component object with fluent methods
    const component = Object.assign(
    // The base run function
    async (props) => {
        return executeComponent(props);
    }, {
        // For direct execution via .run()
        run: async (props) => {
            return executeComponent(props);
        },
        // Bind props without executing
        props: (partialProps) => {
            return createComponent(name, async (props) => {
                return executeComponent({
                    ...props,
                    ...partialProps,
                });
            }, defaultOpts);
        },
        // Bind a provider
        withProvider: (provider) => {
            return createComponent(name, async (props) => {
                // Get componentOpts if they exist
                const componentOpts = props.componentOpts;
                return executeComponent({
                    ...props,
                    componentOpts: {
                        ...componentOpts,
                        provider,
                    },
                });
            }, defaultOpts);
        },
        // Transform the output using a mapping function
        pipe: (mapFn) => {
            return createComponent(`${name}Pipe`, async (props) => {
                // Extract componentOpts from original props, if they exist
                const propsWithOpts = props;
                const componentOpts = propsWithOpts.componentOpts;
                // Execute the component with potentially renamed component
                const result = await executeComponent({
                    ...props,
                    componentOpts,
                });
                // Pass the result to the mapping function
                const mappedResult = await mapFn(result);
                // When the mapping function returns a result from another component,
                // preserve the component name metadata in the checkpoint
                return mappedResult;
            }, defaultOpts);
        },
        // Create conditional branches based on a predicate
        branch: (predicate, ifTrue, ifFalse) => {
            return createComponent(`${name}Branch`, async (props) => {
                const result = await executeComponent(props);
                const condition = await predicate(result);
                return condition ? ifTrue(result) : ifFalse(result);
            }, defaultOpts);
        },
        // Create a map operation that transforms each item in an array output
        map: (mapFn) => {
            return createComponent(`${name}Map`, async (props) => {
                const result = await executeComponent(props);
                if (!Array.isArray(result)) {
                    throw new Error(`Cannot map over non-array result from ${name}`);
                }
                return Promise.all(result.map((item) => resolveDeep(mapFn(item))));
            }, defaultOpts);
        },
        // Fork execution into multiple parallel paths
        fork: (...mapFns) => {
            const fork = {
                join: (joinFn) => {
                    return createComponent(`${name}Join`, async (props) => {
                        const result = await executeComponent(props);
                        const forkedResults = await Promise.all(mapFns.map((fn) => resolveDeep(fn(result))));
                        return resolveDeep(joinFn(...forkedResults));
                    }, defaultOpts);
                },
            };
            return fork;
        },
    });
    // Set the name property
    Object.defineProperty(component, "name", { value: name });
    // Mark as a framework component
    Object.defineProperty(component, "__gsxFramework", { value: true });
    return component;
}
// Factory function to create a component
export function Component(name, fn, defaultOpts) {
    return createComponent(name, fn, defaultOpts);
}
// Implementation that handles all cases
export function StreamComponent(name, fn, defaultOpts) {
    return createComponent(name, async (props) => {
        const context = getCurrentContext();
        const workflowContext = context.getWorkflowContext();
        const { checkpointManager } = workflowContext;
        // Safe extraction of componentOpts with proper typing
        const propWithOpts = props;
        const componentOpts = propWithOpts.componentOpts;
        // Merge component opts with unique secrets
        const mergedOpts = {
            ...defaultOpts,
            ...componentOpts,
            metadata: {
                ...defaultOpts?.metadata,
                ...componentOpts?.metadata,
            },
            secretProps: Array.from(new Set([
                ...(defaultOpts?.secretProps ?? []),
                ...(componentOpts?.secretProps ?? []),
            ])),
            secretOutputs: defaultOpts?.secretOutputs ?? componentOpts?.secretOutputs,
        };
        // Create checkpoint node for this component execution
        const nodeId = checkpointManager.addNode({
            componentName: componentOpts?.name ?? name,
            props: Object.fromEntries(Object.entries(props).filter(([key]) => key !== "componentOpts")),
            componentOpts: mergedOpts,
        }, context.getCurrentNodeId());
        try {
            const iterator = await context.withCurrentNode(nodeId, async () => {
                // Safely extract props without componentOpts
                const propsWithoutOpts = { ...props };
                delete propsWithoutOpts
                    .componentOpts;
                const result = await fn(propsWithoutOpts);
                return isStreamable(result) ? result : await resolveDeep(result);
            });
            if (props.stream) {
                // Mark as streaming immediately
                checkpointManager.completeNode(nodeId, STREAMING_PLACEHOLDER);
                // Create a wrapper iterator that captures the output while streaming
                const wrappedIterator = async function* () {
                    let accumulated = "";
                    try {
                        for await (const token of iterator) {
                            accumulated += token;
                            yield token;
                        }
                        // Update with final content if stream completes
                        checkpointManager.updateNode(nodeId, {
                            output: accumulated,
                            metadata: { streamCompleted: true },
                        });
                    }
                    catch (error) {
                        if (error instanceof Error) {
                            checkpointManager.updateNode(nodeId, {
                                output: accumulated,
                                metadata: {
                                    error: error.message,
                                    streamCompleted: false,
                                },
                            });
                        }
                        throw error;
                    }
                };
                return wrappedIterator();
            }
            // Non-streaming case - accumulate all output then checkpoint
            let result = "";
            for await (const token of iterator) {
                result += token;
            }
            checkpointManager.completeNode(nodeId, result);
            return result; // Explicit cast to help type inference
        }
        catch (error) {
            // Record error in checkpoint
            if (error instanceof Error) {
                checkpointManager.addMetadata(nodeId, { error: error.message });
                checkpointManager.completeNode(nodeId, undefined);
            }
            throw error;
        }
    }, defaultOpts);
}
// Create a simple provider
export function createProvider(value) {
    return {
        value,
        props(props) {
            return createProvider({ ...this.value, ...props });
        },
        async execute(component, props) {
            // Create a properly typed props object with componentOpts
            const propsWithOpts = {
                ...props,
                componentOpts: { provider: this.value },
            };
            return component.withProvider(this.value).run(propsWithOpts);
        },
        async with(fn) {
            // Use type assertion for the context value - create a properly typed context object
            const contextValue = { provider: this.value };
            return await withContext(getCurrentContext().withContext(contextValue), async () => await resolveDeep(fn(this)));
        },
    };
}
// Helper function to execute with a provider for a section of code
export async function withProvider(providerFactory, config, fn) {
    const provider = providerFactory(config);
    return provider.with(() => fn());
}
/**
 * Create a workflow from a component.
 * A workflow is a component that can be executed with additional options.
 */
export function Workflow(name, component) {
    return {
        name,
        run: async (props, options) => {
            // Validate that props is an object at runtime
            if (Array.isArray(props)) {
                throw new Error(`Component ${name} received array instead of object props.`);
            }
            const workflowContext = createWorkflowContext();
            const executionContext = new ExecutionContext({});
            const contextWithWorkflow = executionContext.withContext({
                [Symbol.for("gensx.workflow")]: workflowContext,
            });
            // Set workflow name
            const workflowName = options?.workflowName ?? name;
            workflowContext.workflowName = workflowName;
            // Set checkpoint manager options
            if (options?.printUrl !== undefined) {
                workflowContext.checkpointManager.setPrintUrl(options.printUrl);
            }
            // Set workflow name on checkpoint manager
            workflowContext.checkpointManager.setWorkflowName(workflowName);
            let result;
            try {
                // Run the component with context
                result = await withContext(contextWithWorkflow, async () => {
                    return component.run(props);
                });
                // Add additional metadata if provided
                const rootId = workflowContext.checkpointManager.root?.id;
                if (rootId && options?.metadata) {
                    workflowContext.checkpointManager.addMetadata(rootId, options.metadata);
                }
                // Wait for any pending checkpoints
                await workflowContext.checkpointManager.waitForPendingUpdates();
                return result;
            }
            catch (e) {
                // Wait for any pending checkpoints before throwing
                await workflowContext.checkpointManager.waitForPendingUpdates();
                // Re-throw the error
                throw e;
            }
        },
    };
}
