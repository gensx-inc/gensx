import React from "react";
import { Step } from "../components/Step";
import { renderWorkflow } from "./renderWorkflow";
import { ExecutionContext } from "../context/ExecutionContext";
import { createWorkflowOutput } from "../hooks/useWorkflowOutput";

type WorkflowRenderFunction<T> = (value: T) => React.ReactElement | null;

type WorkflowImplementation<TProps, TOutput> = (
  props: ResolvedProps<TProps>,
  render: WorkflowRenderFunction<TOutput>
) =>
  | React.ReactElement
  | Promise<React.ReactElement>
  | null
  | Promise<React.ReactElement | null>;

type WorkflowComponentProps<TProps, TOutput> = TProps & {
  children?: (output: TOutput) => React.ReactNode;
  setOutput?: (value: TOutput) => void;
};

// Type to convert a props type to allow promises
type PromiseProps<TProps> = {
  [K in keyof TProps]: TProps[K] | Promise<TProps[K]>;
};

// Type to ensure implementation gets resolved props
type ResolvedProps<TProps> = {
  [K in keyof TProps]: TProps[K] extends Promise<infer U> ? U : TProps[K];
};

// This function resolves value in a promise.
// You can await a promise or a plain value and the effect is the same.
// Even though this function might seem unnecessary, using it makes our intent more clear.
async function resolveValue<T>(value: T | Promise<T>): Promise<T> {
  return await value;
}

// Keep track of processed results to prevent infinite loops
const processedResults = new Set<string>();

export function createWorkflow<TProps extends Record<string, any>, TOutput>(
  implementation: WorkflowImplementation<TProps, TOutput>
): React.ComponentType<WorkflowComponentProps<PromiseProps<TProps>, TOutput>> {
  const WorkflowComponent = (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>
  ): React.ReactElement | null => {
    const { children, setOutput, ...componentProps } = props;
    const [output, setWorkflowOutput] = createWorkflowOutput<TOutput>(
      null as any
    );

    const step: Step = {
      async execute(context) {
        try {
          // Resolve all props in parallel
          const resolvedProps = {} as ResolvedProps<TProps>;
          await Promise.all(
            Object.entries(componentProps).map(async ([key, value]) => {
              resolvedProps[key as keyof TProps] = await resolveValue(value);
            })
          );

          // Create render function that sets output and returns element
          const render: WorkflowRenderFunction<TOutput> = (value) => {
            setWorkflowOutput(value);
            if (setOutput) {
              setOutput(value);
            }
            if (children) {
              return children(value) as React.ReactElement;
            }
            return null;
          };

          // Get the workflow result with resolved props
          const element = await Promise.resolve(
            implementation(resolvedProps, render)
          );

          // Process the element chain
          if (element) {
            const elementSteps = renderWorkflow(element);
            // Execute steps sequentially to ensure proper chaining
            for (const step of elementSteps) {
              await step.execute(context);
            }
          }
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

  // For execution phase, we need a way to get the workflow result without React
  WorkflowComponent.getWorkflowResult = async (
    props: WorkflowComponentProps<PromiseProps<TProps>, TOutput>
  ): Promise<React.ReactElement | null> => {
    const { children, setOutput, ...componentProps } = props;

    // Generate a unique key for this result
    const resultKey = JSON.stringify(componentProps);
    if (processedResults.has(resultKey)) {
      return null;
    }
    processedResults.add(resultKey);

    const [output, setWorkflowOutput] = createWorkflowOutput<TOutput>(
      null as any
    );

    try {
      // Resolve all props before passing to implementation
      const resolvedProps = {} as ResolvedProps<TProps>;
      for (const [key, value] of Object.entries(componentProps)) {
        resolvedProps[key as keyof TProps] = await resolveValue(value);
      }

      // Create render function that sets output and returns element
      const render: WorkflowRenderFunction<TOutput> = (value) => {
        setWorkflowOutput(value);
        if (setOutput) {
          setOutput(value);
        }
        if (children) {
          return children(value) as React.ReactElement;
        }
        return null;
      };

      // Get the workflow result
      const implementationResult = await implementation(resolvedProps, render);
      return implementationResult;
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
