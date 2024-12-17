import { createCollector } from "@/src/components/Collect";
import { createWorkflow } from "@/src/utils/workflowBuilder";

interface CollectWorkflowInputs {
  numbers: number[];
  strings: string[];
}

interface CollectWorkflowOutputs {
  num: number;
  str: string;
}

export const CollectWorkflow = createWorkflow<
  CollectWorkflowInputs,
  CollectWorkflowOutputs
>((props, render) => {
  const [NumberCollector, doubledNums] = createCollector<number>();
  const [StringCollector, doubledStrings] = createCollector<string>();

  return (
    <>
      <NumberCollector>
        {() => props.numbers.map(n => <DoubleNumber input={n} />)}
      </NumberCollector>
      <StringCollector>
        {() => props.strings.map(s => <DoubleString input={s} />)}
      </StringCollector>
      <SumNumbers numbers={doubledNums}>
        {sum => (
          <ConcatStrings strings={doubledStrings}>
            {str => render({ num: sum, str })}
          </ConcatStrings>
        )}
      </SumNumbers>
    </>
  );
});

interface ConcatStringsInputs {
  strings: string[];
}

export const ConcatStrings = createWorkflow<ConcatStringsInputs, string>(
  (props, render) => {
    return render(props.strings.reduce((a, b) => a + b, ""));
  },
);

interface SumNumbersInputs {
  numbers: number[];
}

export const SumNumbers = createWorkflow<SumNumbersInputs, number>(
  (props, render) => {
    return render(props.numbers.reduce((a, b) => a + b, 0));
  },
);

// Component for doubling a number
export interface DoubleNumberProps {
  input: number;
}

export type DoubleNumberOutput = number;

export const DoubleNumber = createWorkflow<DoubleNumberProps, number>(
  (props, render) => {
    const doubled = props.input * 2;
    return render(doubled);
  },
);

// Component for doubling a string
export interface DoubleStringProps {
  input: string;
}

export const DoubleString = createWorkflow<DoubleStringProps, string>(
  (props, render) => {
    const doubled = props.input + props.input;
    return render(doubled);
  },
);
