import { createWorkflow } from "@/src/utils/workflowBuilder";

interface FanoutWorkflowInputs {
  numbers: number[];
  strings: string[];
}

interface FanoutWorkflowOutputs {
  num: number;
  str: string;
}

export const FanoutWorkflow = createWorkflow<
  FanoutWorkflowInputs,
  FanoutWorkflowOutputs
>(async (props, { resolve, execute }) => {
  const doubledNums = props.numbers.map(n =>
    execute(DoubleNumber, { input: n }),
  );
  const doubledStrings = props.strings.map(s =>
    execute(DoubleString, { input: s }),
  );

  const resolvedNums = await Promise.all(doubledNums);
  const resolvedStrings = await Promise.all(doubledStrings);

  return (
    <SumNumbers numbers={resolvedNums}>
      {sum => (
        <ConcatStrings strings={resolvedStrings}>
          {str => resolve({ num: sum, str })}
        </ConcatStrings>
      )}
    </SumNumbers>
  );
});

interface ConcatStringsInputs {
  strings: string[];
}

export const ConcatStrings = createWorkflow<ConcatStringsInputs, string>(
  (props, { resolve }) => {
    return resolve(props.strings.join(""));
  },
);

interface SumNumbersInputs {
  numbers: number[];
}

export const SumNumbers = createWorkflow<SumNumbersInputs, number>(
  (props, { resolve }) => {
    return resolve(props.numbers.reduce((a, b) => a + b, 0));
  },
);

// Component for doubling a number
export interface DoubleNumberProps {
  input: number;
}

export const DoubleNumber = createWorkflow<DoubleNumberProps, number>(
  (props, { resolve }) => {
    const doubled = props.input * 2;
    return resolve(doubled);
  },
);

// Component for doubling a string
export interface DoubleStringProps {
  input: string;
}

export const DoubleString = createWorkflow<DoubleStringProps, string>(
  (props, { resolve }) => {
    const doubled = props.input + props.input;
    return resolve(doubled);
  },
);
