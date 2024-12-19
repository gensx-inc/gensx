import { WorkflowContext } from "../components/Workflow";

type WorkflowOutput = Map<
  string,
  {
    promise: Promise<unknown>;
    resolve: (value: unknown) => void;
    hasResolved: boolean;
  }
>;

// Map of workflow context ID to its outputs
const contextOutputs = new Map<string, WorkflowOutput>();

let counter = 0;
function generateStableId() {
  return `output_${counter++}`;
}

export function createWorkflowOutput<T>(
  initialValue: T,
): [Promise<T>, (value: T) => void] {
  const context = WorkflowContext.current ?? {
    id: generateStableId(),
  };

  if (!contextOutputs.has(context.id)) {
    contextOutputs.set(context.id, new Map());
  }

  const outputs = contextOutputs.get(context.id)!;
  const outputId = generateStableId();

  let resolvePromise!: (value: T) => void;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  outputs.set(outputId, {
    promise: promise as Promise<unknown>,
    resolve: resolvePromise as (value: unknown) => void,
    hasResolved: false,
  });

  return [promise, resolvePromise];
}
