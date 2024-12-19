import React, { ComponentType, JSXElementConstructor } from "react";

import { Step } from "../components/Step";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";
import { renderWorkflow } from "../utils/renderWorkflow";

interface WorkflowContextApi<TOutput> {
  resolve: (value: TOutput) => React.ReactElement | null;
  execute: <T>(element: React.ReactElement) => Promise<T>;
}

type WorkflowImplementation<TProps, TOutput> = (
  props: ResolvedProps<TProps>,
  context: WorkflowContextApi<TOutput>,
) =>
  | React.ReactElement
  | Promise<React.ReactElement>
  | null
  | Promise<React.ReactElement | null>;

type WorkflowComponentProps<TProps, TOutput> = TProps & {
  children?: (output: TOutput) => React.ReactNode;
  setOutput?: (value: TOutput) => void;
};

type PromiseProps<TProps> = {
  [K in keyof TProps]: TProps[K] | Promise<TProps[K]>;
};

type ResolvedProps<TProps> = {
  [K in keyof TProps]: TProps[K] extends Promise<infer U> ? U : TProps[K];
};

async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  return await value;
}

function getComponentName(type: string | JSXElementConstructor<any>): string {
  if (typeof type === "string") return type;
  return (type as ComponentType<any>).displayName || type.name || "Unknown";
}

// Track processed workflows by their type and props
const processedWorkflows = new Map<string, Set<string>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWorkflow<TProps extends Record<string, any>, TOutput>(
  implementation: WorkflowImplementation<TProps, TOutput>,
  displayName?: string,
): React.ComponentType<WorkflowComponentProps<PromiseProps<TProps>, TOutput>> {
  const WorkflowComponent = (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>,
  ): React.ReactElement | null => {
    const { children, setOutput, ...componentProps } = props;
    const [, setWorkflowOutput] = createWorkflowOutput<TOutput>(
      null as unknown as TOutput,
    );

    const step: Step = {
      async execute(context) {
        try {
          const resolvedProps = {} as ResolvedProps<TProps>;
          await Promise.all(
            Object.entries(componentProps).map(async ([key, value]) => {
              resolvedProps[key as keyof TProps] = await resolveValue(value);
            }),
          );

          const workflowContext: WorkflowContextApi<TOutput> = {
            resolve: (value: TOutput) => {
              setWorkflowOutput(value);
              if (setOutput) {
                setOutput(value);
              }
              if (children) {
                return children(value) as React.ReactElement;
              }
              return null;
            },
            execute: async <T>(element: React.ReactElement): Promise<T> => {
              const componentName = getComponentName(element.type);
              const [output, setOutput] = createWorkflowOutput<T>(
                null as unknown as T,
              );

              try {
                const elementWithOutput = React.cloneElement(element, {
                  ...element.props,
                  setOutput,
                });

                const elementSteps = renderWorkflow(elementWithOutput);
                await Promise.all(
                  elementSteps.map(step => step.execute(context)),
                );

                const result = await output;
                return result;
              } catch (error) {
                console.error(
                  `[WorkflowBuilder] Error in ${componentName}:`,
                  error,
                );
                throw error;
              }
            },
          };

          const element = await Promise.resolve(
            implementation(resolvedProps, workflowContext),
          );

          if (element) {
            const elementSteps = renderWorkflow(element);
            await Promise.all(elementSteps.map(step => step.execute(context)));
          }

          return [];
        } catch (error) {
          console.error("[WorkflowBuilder] Error in workflow step:", error);
          throw error;
        }
      },
    };

    return React.createElement("div", {
      "data-workflow-step": true,
      step,
    });
  };

  WorkflowComponent.getWorkflowResult = async (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>,
  ): Promise<React.ReactElement | null> => {
    const { children, setOutput, ...componentProps } = props;

    const componentType = displayName || implementation.name || "anonymous";
    const propsKey = JSON.stringify(componentProps);

    if (!processedWorkflows.has(componentType)) {
      processedWorkflows.set(componentType, new Set());
    }
    const processedProps = processedWorkflows.get(componentType)!;

    if (processedProps.has(propsKey)) {
      return null;
    }

    processedProps.add(propsKey);

    try {
      const resolvedProps = {} as ResolvedProps<TProps>;
      for (const [key, value] of Object.entries(componentProps)) {
        resolvedProps[key as keyof TProps] = await resolveValue(value);
      }

      let pendingExecutions: Promise<any>[] = [];

      const workflowContext: WorkflowContextApi<TOutput> = {
        resolve: (value: TOutput) => {
          if (setOutput) {
            setOutput(value);
          }
          if (children) {
            return children(value) as React.ReactElement;
          }
          return null;
        },
        execute: async <T>(element: React.ReactElement): Promise<T> => {
          const componentName = getComponentName(element.type);
          const [output, setOutput] = createWorkflowOutput<T>(
            null as unknown as T,
          );

          try {
            const componentImpl = (element.type as any).implementation;
            if (!componentImpl) {
              throw new Error(
                `Component ${componentName} does not have an implementation`,
              );
            }

            const executionProps = {
              ...element.props,
              setOutput,
            };

            const executionPromise = (async () => {
              const subContext: WorkflowContextApi<T> = {
                resolve: (value: T) => {
                  setOutput(value);
                  return null;
                },
                execute: workflowContext.execute,
              };

              await componentImpl(executionProps, subContext);
              const result = await output;
              return result;
            })();

            pendingExecutions.push(executionPromise);
            const result = await executionPromise;
            return result;
          } catch (error) {
            console.error(
              `[WorkflowBuilder] Error executing ${componentName}:`,
              error,
            );
            throw error;
          }
        },
      };

      const result = await implementation(resolvedProps, workflowContext);

      if (pendingExecutions.length > 0) {
        await Promise.all(pendingExecutions);
      }

      return result;
    } catch (error) {
      console.error(
        `[WorkflowBuilder] Error in workflow ${componentType}:`,
        error,
      );
      throw error;
    } finally {
      processedWorkflows.get(componentType)?.delete(propsKey);
    }
  };

  WorkflowComponent.displayName =
    displayName || implementation.name || "Workflow";
  // Attach the implementation to the component
  (WorkflowComponent as any).implementation = implementation;
  return WorkflowComponent;
}
