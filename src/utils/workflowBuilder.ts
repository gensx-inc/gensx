/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import React, {
  ComponentType,
  FunctionComponent,
  JSXElementConstructor,
  ReactElement,
} from "react";

import { Step } from "../components/Step";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";
import { renderWorkflow } from "../utils/renderWorkflow";

// Public interface that components will use
export interface WorkflowContext<TOutput> {
  resolve: (value: TOutput) => ReactElement | null;
  execute: <TProps, TComponentOutput>(
    component: FunctionComponent<
      WorkflowComponentProps<PromiseProps<TProps>, TComponentOutput>
    > & {
      implementation?: WorkflowImplementation<TProps, TComponentOutput>;
    },
    props: Omit<TProps, "setOutput" | "children">,
  ) => Promise<TComponentOutput>;
}

// Private implementation type
type WorkflowExecutionContextImpl<TOutput> = WorkflowContext<TOutput>;

type WorkflowImplementation<TProps, TOutput> = (
  props: ResolvedProps<TProps>,
  context: WorkflowContext<TOutput>,
) => ReactElement | Promise<ReactElement> | null | Promise<ReactElement | null>;

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

function getComponentName(
  type: string | JSXElementConstructor<unknown>,
): string {
  if (typeof type === "string") return type;
  const component = type as { displayName?: string; name?: string };
  return component.displayName ?? component.name ?? "Unknown";
}

// Track processed workflows by their type and props
const processedWorkflows = new Map<string, Set<string>>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createWorkflow<TProps extends Record<string, any>, TOutput>(
  implementation: WorkflowImplementation<TProps, TOutput>,
): FunctionComponent<WorkflowComponentProps<PromiseProps<TProps>, TOutput>> & {
  getWorkflowResult: (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>,
  ) => Promise<ReactElement | null>;
  implementation: typeof implementation;
  __outputType?: TOutput; // Add type marker to component
} {
  const WorkflowComponent = (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>,
  ): ReactElement | null => {
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

          const workflowContext: WorkflowExecutionContextImpl<TOutput> = {
            resolve: (value: TOutput) => {
              setWorkflowOutput(value);
              if (setOutput) {
                setOutput(value);
              }
              if (children) {
                return children(value) as ReactElement;
              }
              return null;
            },
            execute: async <TProps, TComponentOutput>(
              component: FunctionComponent<
                WorkflowComponentProps<PromiseProps<TProps>, TComponentOutput>
              > & {
                implementation?: WorkflowImplementation<
                  TProps,
                  TComponentOutput
                >;
              },
              props: Omit<TProps, "setOutput" | "children">,
            ): Promise<TComponentOutput> => {
              const componentName = getComponentName(
                component as ComponentType<unknown>,
              );
              const [output, setOutput] =
                createWorkflowOutput<TComponentOutput>(
                  null as unknown as TComponentOutput,
                );

              try {
                if (!component.implementation) {
                  throw new Error(
                    `Component ${componentName} does not have an implementation`,
                  );
                }

                const resolvedProps = {
                  ...props,
                  setOutput,
                } as unknown as ResolvedProps<TProps>;

                const elementWithOutput = React.createElement(
                  component as ComponentType<
                    TProps & { setOutput: typeof setOutput }
                  >,
                  resolvedProps as TProps & { setOutput: typeof setOutput },
                );

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
      step: step as unknown as Record<string, unknown>,
    });
  };

  WorkflowComponent.getWorkflowResult = async (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>,
  ): Promise<ReactElement | null> => {
    const { children, setOutput, ...componentProps } = props;

    const componentType = implementation.name ?? "anonymous";
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

      const pendingExecutions: Promise<unknown>[] = [];

      const workflowContext: WorkflowExecutionContextImpl<TOutput> = {
        resolve: (value: TOutput) => {
          if (setOutput) {
            setOutput(value);
          }
          if (children) {
            return children(value) as ReactElement;
          }
          return null;
        },
        execute: async <TProps, TComponentOutput>(
          component: FunctionComponent<
            WorkflowComponentProps<PromiseProps<TProps>, TComponentOutput>
          > & {
            implementation?: WorkflowImplementation<TProps, TComponentOutput>;
          },
          props: Omit<TProps, "setOutput" | "children">,
        ): Promise<TComponentOutput> => {
          const componentName = getComponentName(
            component as ComponentType<unknown>,
          );
          const [output, setOutput] = createWorkflowOutput<TComponentOutput>(
            null as unknown as TComponentOutput,
          );

          try {
            if (!component.implementation) {
              throw new Error(
                `Component ${componentName} does not have an implementation`,
              );
            }

            const resolvedProps = {
              ...props,
              setOutput,
            } as unknown as ResolvedProps<TProps>;

            const executionPromise = (async () => {
              const subContext: WorkflowExecutionContextImpl<TComponentOutput> =
                {
                  resolve: (value: TComponentOutput) => {
                    setOutput(value);
                    return null;
                  },
                  execute: workflowContext.execute,
                };

              await component.implementation!(resolvedProps, subContext);
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

  WorkflowComponent.displayName = implementation.name ?? "Workflow";
  WorkflowComponent.implementation = implementation;

  return WorkflowComponent as FunctionComponent<
    WorkflowComponentProps<PromiseProps<TProps>, TOutput>
  > & {
    getWorkflowResult: typeof WorkflowComponent.getWorkflowResult;
    implementation: typeof implementation;
  };
}
