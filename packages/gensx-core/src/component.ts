import type {
  ComponentOpts,
  DefaultOpts,
  FluentComponent,
  FluentFork,
  MaybePromise,
  Provider as ProviderType,
  Streamable,
} from "./types.js";

import serializeErrorPkg from "@common.js/serialize-error";
const { serializeError } = serializeErrorPkg;

import { getCurrentContext, withContext } from "./context.js";
import { ExecutionContext } from "./context.js";
import { resolveDeep } from "./resolve.js";
import { isStreamable } from "./stream.js";
import { createWorkflowContext } from "./workflow-context.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

// Core component function implementation
function createComponent<P extends object, O>(
  name: string,
  fn: (props: P) => MaybePromise<O>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P, O> {
  // Create the base execution function
  async function executeComponent(
    props: P & { componentOpts?: ComponentOpts },
  ): Promise<O> {
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
      secretProps: Array.from(
        new Set([
          ...(defaultOpts?.secretProps ?? []),
          ...(props.componentOpts?.secretProps ?? []),
        ]),
      ),
      secretOutputs:
        defaultOpts?.secretOutputs ?? props.componentOpts?.secretOutputs,
    };

    // Create checkpoint node for this component execution
    const nodeId = checkpointManager.addNode(
      {
        componentName: props.componentOpts?.name ?? name,
        props: Object.fromEntries(
          Object.entries(props).filter(([key]) => key !== "componentOpts"),
        ),
        componentOpts: mergedOpts,
      },
      currentNodeId,
    );

    try {
      const result = await context.withCurrentNode(nodeId, async () => {
        const { componentOpts, ...componentProps } = props;
        const fnResult = await fn(componentProps as P);
        return resolveDeep<O>(fnResult);
      });

      // Complete the checkpoint node with the result
      checkpointManager.completeNode(nodeId, result);

      return result;
    } catch (error) {
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
    async (
      props?: Partial<P> & { componentOpts?: ComponentOpts },
    ): Promise<O> => {
      return executeComponent(props as P & { componentOpts?: ComponentOpts });
    },
    {
      // For direct execution via .run()
      run: async (
        props?: Partial<P> & { componentOpts?: ComponentOpts },
      ): Promise<O> => {
        return executeComponent(props as P & { componentOpts?: ComponentOpts });
      },

      // Bind props without executing
      props: (partialProps: Partial<P>): FluentComponent<P, O> => {
        return createComponent(
          name,
          async (props: P) => {
            return executeComponent({
              ...props,
              ...partialProps,
            } as P & { componentOpts?: ComponentOpts });
          },
          defaultOpts,
        );
      },

      // Bind a provider
      withProvider: (provider: unknown): FluentComponent<P, O> => {
        return createComponent(
          name,
          async (props: P) => {
            // Get componentOpts if they exist
            const componentOpts = (
              props as unknown as { componentOpts?: ComponentOpts }
            ).componentOpts;

            return executeComponent({
              ...props,
              componentOpts: {
                ...componentOpts,
                provider,
              },
            } as P & { componentOpts?: ComponentOpts });
          },
          defaultOpts,
        );
      },

      // Transform the output using a mapping function
      pipe: <R>(
        mapFn: (output: O) => MaybePromise<R>,
      ): FluentComponent<P, R> => {
        return createComponent<P, R>(
          `${name}Pipe`,
          async (props: P) => {
            // Extract componentOpts from original props, if they exist
            const propsWithOpts = props as P & {
              componentOpts?: ComponentOpts;
            };
            const componentOpts = propsWithOpts.componentOpts;

            // Execute the component with potentially renamed component
            const result = await executeComponent({
              ...props,
              componentOpts,
            } as P & { componentOpts?: ComponentOpts });

            // Pass the result to the mapping function
            const mappedResult = await mapFn(result);

            // When the mapping function returns a result from another component,
            // preserve the component name metadata in the checkpoint
            return mappedResult;
          },
          defaultOpts,
        );
      },

      // Create conditional branches based on a predicate
      branch: <R>(
        predicate: (output: O) => boolean | Promise<boolean>,
        ifTrue: (output: O) => MaybePromise<R>,
        ifFalse: (output: O) => MaybePromise<R>,
      ): FluentComponent<P, R> => {
        return createComponent<P, R>(
          `${name}Branch`,
          async (props: P) => {
            const result = await executeComponent(
              props as P & { componentOpts?: ComponentOpts },
            );
            const condition = await predicate(result);
            return condition ? ifTrue(result) : ifFalse(result);
          },
          defaultOpts,
        );
      },

      // Create a map operation that transforms each item in an array output
      map: <R>(
        mapFn: (item: unknown) => MaybePromise<R>,
      ): FluentComponent<P, R[]> => {
        return createComponent<P, R[]>(
          `${name}Map`,
          async (props: P) => {
            const result = await executeComponent(
              props as P & { componentOpts?: ComponentOpts },
            );
            if (!Array.isArray(result)) {
              throw new Error(`Cannot map over non-array result from ${name}`);
            }
            return Promise.all(
              result.map((item) => resolveDeep<R>(mapFn(item))),
            );
          },
          defaultOpts,
        );
      },

      // Fork execution into multiple parallel paths
      fork: (
        ...mapFns: ((output: O) => MaybePromise<unknown>)[]
      ): FluentFork<P, O, unknown[]> => {
        const fork: FluentFork<P, O, unknown[]> = {
          join: <R2>(
            joinFn: (...results: unknown[]) => MaybePromise<R2>,
          ): FluentComponent<P, R2> => {
            return createComponent<P, R2>(
              `${name}Join`,
              async (props: P) => {
                const result = await executeComponent(
                  props as P & { componentOpts?: ComponentOpts },
                );
                const forkedResults = await Promise.all(
                  mapFns.map((fn) => resolveDeep(fn(result))),
                );
                return resolveDeep(joinFn(...forkedResults));
              },
              defaultOpts,
            );
          },
        };
        return fork;
      },
    },
  );

  // Set the name property
  Object.defineProperty(component, "name", { value: name });

  // Mark as a framework component
  Object.defineProperty(component, "__gsxFramework", { value: true });

  return component as FluentComponent<P, O>;
}

// Factory function to create a component
export function Component<P extends object, O>(
  name: string,
  fn: (props: P) => MaybePromise<O>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P, O> {
  return createComponent<P, O>(name, fn, defaultOpts);
}

// Factory function to create a streaming component with proper type overloads
// Overload 1: When stream is explicitly true, return Streamable
export function StreamComponent<P extends object>(
  name: string,
  fn: (props: P & { stream: true }) => MaybePromise<Streamable>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P & { stream: true }, Streamable>;

// Overload 2: When stream is explicitly false, return string
export function StreamComponent<P extends object>(
  name: string,
  fn: (props: P & { stream: false }) => MaybePromise<Streamable>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P & { stream: false }, string>;

// Overload 3: When stream is not specified (defaults to false), return string
export function StreamComponent<P extends object>(
  name: string,
  fn: (props: P & { stream?: never }) => MaybePromise<Streamable>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P & { stream?: never }, string>;

// Implementation that handles all cases
export function StreamComponent<P extends object>(
  name: string,
  fn: (props: P & { stream?: boolean }) => MaybePromise<Streamable>,
  defaultOpts?: DefaultOpts,
): FluentComponent<P & { stream?: boolean }, string | Streamable> {
  const component = createComponent<
    P & { stream?: boolean },
    string | Streamable
  >(
    name,
    async (props) => {
      const context = getCurrentContext();
      const workflowContext = context.getWorkflowContext();
      const { checkpointManager } = workflowContext;

      // Safe extraction of componentOpts with proper typing
      const propWithOpts = props as unknown as {
        componentOpts?: ComponentOpts;
      };
      const componentOpts = propWithOpts.componentOpts;

      // Merge component opts with unique secrets
      const mergedOpts = {
        ...defaultOpts,
        ...componentOpts,
        metadata: {
          ...defaultOpts?.metadata,
          ...componentOpts?.metadata,
        },
        secretProps: Array.from(
          new Set([
            ...(defaultOpts?.secretProps ?? []),
            ...(componentOpts?.secretProps ?? []),
          ]),
        ),
        secretOutputs:
          defaultOpts?.secretOutputs ?? componentOpts?.secretOutputs,
      };

      // Create checkpoint node for this component execution
      const nodeId = checkpointManager.addNode(
        {
          componentName: componentOpts?.name ?? name,
          props: Object.fromEntries(
            Object.entries(props).filter(([key]) => key !== "componentOpts"),
          ),
          componentOpts: mergedOpts,
        },
        context.getCurrentNodeId(),
      );

      try {
        const iterator: Streamable = await context.withCurrentNode(
          nodeId,
          async () => {
            // Safely extract props without componentOpts
            const { componentOpts: _, ...propsWithoutOpts } = props as P & {
              stream?: boolean;
              componentOpts?: ComponentOpts;
            };

            const result = await fn(
              propsWithoutOpts as P & { stream?: boolean },
            );
            return isStreamable(result) ? result : await resolveDeep(result);
          },
        );

        if (props.stream) {
          // Mark as streaming immediately
          checkpointManager.updateNode(nodeId, {
            output: STREAMING_PLACEHOLDER,
            metadata: { streamCompleted: false },
          });

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
            } catch (error) {
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

          return wrappedIterator() as Streamable;
        }

        // Non-streaming case - accumulate all output then checkpoint
        let result = "";
        for await (const token of iterator) {
          result += token;
        }
        checkpointManager.completeNode(nodeId, result);
        return result;
      } catch (error) {
        // Record error in checkpoint
        if (error instanceof Error) {
          checkpointManager.addMetadata(nodeId, { error: error.message });
          checkpointManager.completeNode(nodeId, undefined);
        }
        throw error;
      }
    },
    defaultOpts,
  );

  // Use a more precise type assertion here to match the overload signatures
  return component as unknown as FluentComponent<
    P & { stream?: boolean },
    string | Streamable
  >;
}

// Create a simple provider
export function createProvider<T>(value: T): ProviderType<T> {
  return {
    value,

    props(props: Partial<T>): ProviderType<T> {
      return createProvider({ ...this.value, ...props } as T);
    },

    async execute<P extends object, O>(
      component: FluentComponent<P, O>,
      props?: P,
    ): Promise<O> {
      // Create a properly typed props object with componentOpts
      const propsWithOpts = {
        ...props,
        componentOpts: { provider: this.value },
      } as Partial<P> & { componentOpts?: ComponentOpts };

      return component.withProvider(this.value).run(propsWithOpts);
    },

    async with<R>(
      fn: (provider: ProviderType<T>) => MaybePromise<R>,
    ): Promise<R> {
      // Use type assertion for the context value - create a properly typed context object
      const contextValue = { provider: this.value } as unknown as Partial<
        Record<symbol, unknown>
      >;

      return await withContext(
        getCurrentContext().withContext(contextValue),
        async () => await resolveDeep(fn(this)),
      );
    },
  };
}

// Helper function to execute with a provider for a section of code
export async function withProvider<T, R>(
  providerFactory: (config: T) => ProviderType<unknown>,
  config: T,
  fn: () => MaybePromise<R>,
): Promise<R> {
  const provider = providerFactory(config);
  return provider.with(() => fn());
}

/**
 * Create a workflow from a component.
 * A workflow is a component that can be executed with additional options.
 */
export function Workflow<P extends object, T>(
  name: string,
  component: FluentComponent<P, T>,
) {
  return {
    name,
    run: async (
      props: P,
      options?: {
        workflowName?: string;
        printUrl?: boolean;
        metadata?: Record<string, unknown>;
      },
    ) => {
      // Validate that props is an object at runtime
      if (Array.isArray(props)) {
        throw new Error(
          `Component ${name} received array instead of object props.`,
        );
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

      try {
        // Run the component with context
        const result = await withContext(contextWithWorkflow, async () => {
          return component.run(props);
        });

        // Add additional metadata if provided
        const rootId = workflowContext.checkpointManager.root?.id;
        if (rootId && options?.metadata) {
          workflowContext.checkpointManager.addMetadata(
            rootId,
            options.metadata,
          );
        }

        // Wait for any pending checkpoints
        await workflowContext.checkpointManager.waitForPendingUpdates();

        return result;
      } catch (e) {
        // Wait for any pending checkpoints before throwing
        await workflowContext.checkpointManager.waitForPendingUpdates();

        // Re-throw the error
        throw e;
      }
    },
  };
}
