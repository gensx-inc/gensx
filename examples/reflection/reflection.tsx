import * as gensx from "@gensx/core";

export interface ReflectionOutput {
  feedback: string;
  continueProcessing: boolean;
}

interface ReflectionProps<TInput> {
  // The initial input to process
  input: TInput;
  // Component to process the input and generate new output
  ImproveFn: gensx.GsxComponent<{ input: TInput; feedback: string }, TInput>;
  // Component to evaluate if we should continue processing and provide feedback
  EvaluateFn: gensx.GsxComponent<{ input: TInput }, ReflectionOutput>;
  // Current iteration count
  iterations?: number;
  // Maximum number of iterations allowed
  maxIterations?: number;
}

/**
 * A generic component for implementing reflection-based processing.
 * It will continue processing the input until either:
 * 1. the evaluate function returns false
 * 2. maxIterations is reached
 */
export function createReflectionLoop<TInput>(name: string) {
  return gensx.Component<ReflectionProps<TInput>, TInput>(
    name,
    async ({
      input,
      ImproveFn,
      EvaluateFn,
      iterations = 0,
      maxIterations = 3,
    }) => {
      // Check if we should continue processing
      const { feedback, continueProcessing } =
        await gensx.execute<ReflectionOutput>(<EvaluateFn input={input} />);

      if (continueProcessing && iterations < maxIterations) {
        // Process the input
        const newInput: TInput = await gensx.execute<TInput>(
          <ImproveFn input={input} feedback={feedback} />,
        );

        // Recursive call with updated input and iteration count
        const Reflection = createReflectionLoop<TInput>(name);
        return (
          <Reflection
            input={newInput}
            ImproveFn={ImproveFn}
            EvaluateFn={EvaluateFn}
            iterations={iterations + 1}
            maxIterations={maxIterations}
          />
        );
      }

      // Return the final input when we're done processing
      return input;
    },
  );
}
