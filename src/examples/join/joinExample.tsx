import React from "react";
import { createWorkflow } from "../../core/utils/workflow-builder";
import { Join } from "../../core/components/Join";
import { createWorkflowOutput } from "../../core/hooks/useWorkflowOutput";

export type JoinWorkflowProps = {
  numbers: number[];
  strings: string[];
};

export type JoinWorkflowOutput = number;

export const JoinWorkflow = createWorkflow<
  JoinWorkflowProps,
  JoinWorkflowOutput
>(async (props, render) => {
  return (
    <>
      <Join<number, number>
        items={props.numbers}
        map={(num) => <DoubleNumber input={num} />}
        concurrency="parallel"
      >
        {(results) => {
          const doubledSum = results.reduce((a, b) => a + b, 0);
          return render(doubledSum);
        }}
      </Join>
      {/* <JoinChildren concurrency="parallel">
        {props.strings.map((str) => (
          <DoubleString input={str} />
        ))}
        {(results) => {
          setStr(results.reduce((a, b) => a + b.result, ""));
          return null;
        }}
      </JoinChildren> */}
    </>
  );
});

// Component for doubling a number
export type DoubleNumberProps = {
  input: number;
};

export type DoubleNumberOutput = number;

export const DoubleNumber = createWorkflow<DoubleNumberProps, number>(
  async (props, render) => {
    const doubled = props.input * 2;
    return render(doubled);
  }
);

// Component for doubling a string
export type DoubleStringProps = {
  input: string;
};

export type DoubleStringOutput = {
  result: string;
};

export const DoubleString = createWorkflow<
  DoubleStringProps,
  DoubleStringOutput
>(async (props, render) => {
  const doubled = props.input + props.input;
  return render({ result: doubled });
});
