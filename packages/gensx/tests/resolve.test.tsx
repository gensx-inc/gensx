import { expect, suite, test } from "vitest";

import { gsx } from "@/index";

suite("resolveDeep", () => {
  const Doubler = gsx.Component<{ foo: number }, number>("Doubler", (props) => {
    return props.foo * 2;
  });

  const ArrayComponent = gsx.Component<{ inputs: number[] }, number[]>(
    "ArrayComponent",
    (props) => {
      return gsx
        .array(props.inputs)
        .map<number>((input) => <Doubler foo={input} />);
    },
  );

  test("will resolve GsxArray", async () => {
    const result = await gsx.execute(<ArrayComponent inputs={[1, 2, 3]} />);
    expect(result).toEqual([2, 4, 6]);
  });
});
