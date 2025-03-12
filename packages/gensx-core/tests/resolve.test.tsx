import { expect, suite, test } from "vitest";

import * as gensx from "@/index.js";
import { resolveDeep } from "@/resolve.js";

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

  test("does not deeply resolve class instances", async () => {
    const response = new Response("Hello, world!");
    const result = await resolveDeep(response);

    expect(result).toEqual(response);
  });

  test("does not deeply resolve custom class instances", async () => {
    class CustomClass {
      constructor(public foo: number) {}
    }

    const instance = new CustomClass(1);

    const result = await resolveDeep(instance);
    expect(result).toEqual(instance);
  });

  test("does deeply resolve plain objects", async () => {
    const result = await resolveDeep({ foo: <Doubler foo={1} /> });
    expect(result).toEqual({ foo: 2 });
  });
});
