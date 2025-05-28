import * as gensx from "@gensx/core";

export interface ReflectionOutput {
  feedback: string;
  continueProcessing: boolean;
}

interface ReflectionProps<TInput> {
  // The initial input to process
  input: TInput;
  // Component to process the input and generate new output
  ImproveFn: (props: { input: TInput; feedback: string }) => Promise<TInput>;
  // Component to evaluate if we should continue processing and provide feedback
  EvaluateFn: (props: { input: TInput }) => Promise<ReflectionOutput>;
  // Maximum number of iterations allowed
  maxIterations?: number;
}

/**
 * A generic component for implementing reflection-based processing.
 * It will continue processing the input until either:
 * 1. the evaluate function returns false
 * 2. maxIterations is reached
 */
const Reflection = gensx.Component("Reflection", async <TInput>({
  input,
  ImproveFn,
  EvaluateFn,
  maxIterations = 3,
}: ReflectionProps<TInput>): Promise<TInput> => {
  let currentInput = input;
  let iteration = 0;

  while (iteration < maxIterations) {
    // Check if we should continue processing
    const { feedback, continueProcessing } = await EvaluateFn({ input: currentInput });

    if (!continueProcessing) {
      break;
    }

    // Process the input
    currentInput = await ImproveFn({ input: currentInput, feedback });
    iteration++;
  }

  // Return the final input when we're done processing
  return currentInput;
});

export { Reflection };
