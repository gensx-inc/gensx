import { expect, test } from "vitest";

import { gsx } from "../src";

interface NumberWrapperOutput {
  value: number;
}

const NumberWrapper = gsx.Component<{ n: number }, NumberWrapperOutput>(
  "NumberWrapper",
  ({ n }) => ({ value: n }),
);

const NumberDoubler = gsx.Component<{ value: number }, number>(
  "NumberDoubler",
  ({ value }) => value * 2,
);

const AsyncNumberFilter = gsx.Component<{ value: number }, boolean>(
  "AsyncNumberFilter",
  async ({ value }) => {
    await new Promise(resolve => setTimeout(resolve, 1));
    return value > 5;
  },
);

const Value = gsx.Component<{ value: number }, number>(
  "Value",
  ({ value }) => value,
);

const TaskGenerator = gsx.Component<{ value: number }, number[]>(
  "TaskGenerator",
  async ({ value }) => {
    // Simulate a workflow step that generates multiple tasks
    await new Promise(resolve => setTimeout(resolve, 1));
    // For each input, generate [value, value*2] as sub-tasks
    return [value, value * 2];
  },
);

test("map transforms array elements", async () => {
  const arr = gsx.array<NumberWrapperOutput>([
    <NumberWrapper n={1} />,
    <NumberWrapper n={2} />,
    <NumberWrapper n={3} />,
  ]);
  const result = await arr
    .map(n => <NumberDoubler value={n.value} />)
    .toArray();

  expect(result).toEqual([2, 4, 6]);
});

test("filter removes elements based on predicate", async () => {
  const arr = gsx.array<NumberWrapperOutput>([
    <NumberWrapper n={1} />,
    <NumberWrapper n={2} />,
    <NumberWrapper n={3} />,
    <NumberWrapper n={4} />,
    <NumberWrapper n={5} />,
    <NumberWrapper n={6} />,
  ]);
  const result = await arr
    .filter(n => <AsyncNumberFilter value={n.value} />)
    .toArray();

  expect(result).toEqual([{ value: 6 }]);
});

test("reduce accumulates results", async () => {
  const arr = gsx.array<NumberWrapperOutput>([
    <NumberWrapper n={1} />,
    <NumberWrapper n={2} />,
    <NumberWrapper n={3} />,
  ]);
  const result = await arr
    .map<number>(n => <NumberDoubler value={n.value} />)
    .map<number>(n => <Value value={n} />)
    .reduce((acc: number, n: number) => <Value value={acc + n} />, 0);

  expect(result).toEqual(12); // (1*2 + 2*2 + 3*2)
});

test("chains multiple operations", async () => {
  const arr = gsx.array<NumberWrapperOutput>([
    <NumberWrapper n={1} />,
    <NumberWrapper n={2} />,
    <NumberWrapper n={3} />,
    <NumberWrapper n={4} />,
    <NumberWrapper n={5} />,
  ]);
  const result = await arr
    .map<number>(n => <NumberDoubler value={n.value} />)
    .map<number>(n => <Value value={n} />)
    .filter((n: number) => <AsyncNumberFilter value={n} />)
    .reduce<number>((acc: number, n: number) => <Value value={acc + n} />, 0);

  expect(result).toEqual(24); // (6 + 8 + 10) where all values > 5 are kept
});

test("flatMap generates multiple tasks from each input", async () => {
  const arr = gsx.array<NumberWrapperOutput>([
    <NumberWrapper n={1} />,
    <NumberWrapper n={2} />,
  ]);

  const result = await arr
    .flatMap(n => <TaskGenerator value={n.value} />)
    .toArray();

  // Each input n generates [n, n*2]
  // So input [1, 2] becomes [1, 2, 2, 4]
  expect(result).toEqual([1, 2, 2, 4]);
});
