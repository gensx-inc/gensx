/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React from "react";

import { Step } from "../components/Step";

type FunctionComponent = (props: unknown) => React.ReactElement | null;

// Keep track of workflows that have been processed to avoid double execution
const processedWorkflows = new Set<string>();

export function renderWorkflow(element: React.ReactElement): Step[] {
  processedWorkflows.clear();
  const steps: Step[] = [];

  function processElement(el: React.ReactNode): void {
    if (!React.isValidElement(el)) {
      return;
    }

    // If it's a function component, execute it and process its result
    const type = el.type as any;

    if (typeof type === "function" && !type.prototype?.render) {
      // For workflow components, use getWorkflowResult
      if (type.getWorkflowResult) {
        // Generate a unique key for this workflow instance
        const workflowKey = `${type.name}_${
          type.displayName || ""
        }_${Object.entries(el.props as Record<string, unknown>)
          .map(
            ([key, value]) =>
              `${key}:${value instanceof Promise ? "Promise" : (value as string)}`,
          )
          .join("_")}`;

        if (!processedWorkflows.has(workflowKey)) {
          processedWorkflows.add(workflowKey);

          // Create a step for this workflow component
          const step: Step = {
            async execute(context) {
              const resolvedProps = {} as any;
              // Resolve any promise props
              for (const [key, value] of Object.entries(
                el.props as Record<string, unknown>,
              )) {
                resolvedProps[key] =
                  value instanceof Promise ? await value : value;
              }
              // Execute the workflow with resolved props
              const result = await type.getWorkflowResult(resolvedProps);

              // Process any nested elements
              if (result) {
                const nestedSteps = renderWorkflow(result);
                // Execute nested steps sequentially
                for (const nestedStep of nestedSteps) {
                  await nestedStep.execute(context);
                }
              }

              return [];
            },
          };

          steps.push(step);
        }
      } else {
        // For regular components, execute them directly
        const Component = type as FunctionComponent;
        const result = Component(el.props);
        if (result) {
          processElement(result);
        }
      }
      return;
    }

    // Check if this is a WorkflowStep
    const props = el.props as Record<string, any>;
    if (props["data-workflow-step"]) {
      steps.push(props.step);
      return;
    }

    // Process children
    if (props.children) {
      if (Array.isArray(props.children)) {
        props.children.forEach((child: React.ReactNode) => {
          processElement(child);
        });
      } else {
        processElement(props.children);
      }
    }
  }

  processElement(element);
  return steps;
}
