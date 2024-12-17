/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";

import { Step } from "../components/Step";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";
import { renderWorkflow } from "../utils/renderWorkflow";

type WorkflowRenderFunction<T> = (value: T) => React.ReactElement | null;

type WorkflowImplementation<
  TProps,
  TOutput,
  TChildren = (output: TOutput) => React.ReactNode,
> = (
  props: ResolvedProps<TProps> & {
    children?: TChildren;
    __rawChildren?: TChildren;
  },
  render: WorkflowRenderFunction<TOutput>,
) =>
  | React.ReactElement
  | Promise<React.ReactElement>
  | null
  | Promise<React.ReactElement | null>;

type WorkflowComponentProps<
  TProps,
  TOutput,
  TChildren = (output: TOutput) => React.ReactNode,
> = TProps & {
  children?: TChildren;
  __rawChildren?: TChildren; // Just pass through raw children
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

const processedResults = new Set<string>();

export function createWorkflow<
  TProps extends Record<string, any>,
  TOutput,
  TChildren = (output: TOutput) => React.ReactNode,
>(
  implementation: WorkflowImplementation<TProps, TOutput, TChildren>,
): React.ComponentType<
  WorkflowComponentProps<PromiseProps<TProps>, TOutput, TChildren>
> {
  const WorkflowComponent = (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput, TChildren>,
  ): React.ReactElement | null => {
    const { children, setOutput, __rawChildren, ...componentProps } = props;

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

          const propsWithChildren = {
            ...resolvedProps,
            children,
            __rawChildren: children,
          };

          const render: WorkflowRenderFunction<TOutput> = value => {
            setWorkflowOutput(value);
            if (setOutput) {
              setOutput(value);
            }
            if (children && typeof children === "function") {
              return children(value) as React.ReactElement;
            }
            return null;
          };

          const element = await Promise.resolve(
            implementation(propsWithChildren, render),
          );

          if (element) {
            const elementSteps = renderWorkflow(element);
            for (const step of elementSteps) {
              await step.execute(context);
            }
          }

          return [];
        } catch (error) {
          console.error("Error in workflow step:", error);
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
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput, TChildren>,
  ): Promise<React.ReactElement | null> => {
    const { children, setOutput, __rawChildren, ...componentProps } = props;

    const resultKey = JSON.stringify(componentProps);
    if (processedResults.has(resultKey)) {
      return null;
    }
    processedResults.add(resultKey);

    const [, setWorkflowOutput] = createWorkflowOutput<TOutput>(
      null as unknown as TOutput,
    );

    try {
      const resolvedProps = {} as ResolvedProps<TProps>;
      for (const [key, value] of Object.entries(componentProps)) {
        resolvedProps[key as keyof TProps] = await resolveValue(value);
      }

      const propsWithChildren = {
        ...resolvedProps,
        children,
        __rawChildren: children,
      };

      const render: WorkflowRenderFunction<TOutput> = value => {
        setWorkflowOutput(value);
        if (setOutput) {
          setOutput(value);
        }
        if (children && typeof children === "function") {
          return children(value) as React.ReactElement;
        }
        return null;
      };

      return await implementation(propsWithChildren, render);
    } catch (error) {
      console.error("Error in getWorkflowResult:", error);
      throw error;
    } finally {
      processedResults.delete(resultKey);
    }
  };

  WorkflowComponent.displayName = "Workflow";
  return WorkflowComponent;
}
