import { expect, suite, test } from "vitest";

import * as gensx from "@/index.js";

suite("resolveDeep", () => {
  const Doubler = gensx.Component<{ foo: number }, number>(
    "Doubler",
    (props) => {
      return props.foo * 2;
    },
  );

  const ArrayComponent = gensx.Component<{ inputs: number[] }, number[]>(
    "ArrayComponent",
    (props) => {
      return gensx
        .array(props.inputs)
        .map<number>((input) => <Doubler foo={input} />);
    },
  );

  test("will resolve GsxArray", async () => {
    const result = await gensx.execute(<ArrayComponent inputs={[1, 2, 3]} />);
    expect(result).toEqual([2, 4, 6]);
  });
});
