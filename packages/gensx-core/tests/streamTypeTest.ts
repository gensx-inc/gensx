// This is a TypeScript-only test file to check type inference
// It's not meant to be run, just type-checked

import * as gensx from "../src/index";

// Mock component implementation
const TestStreamComponent = gensx.StreamComponent<{ foo: string }>(
  "TestStreamComponent",
  async function* ({ foo }) {
    await Promise.resolve(); // Add await to satisfy async
    yield foo;
  },
);

// Type assertion function that will cause compile errors if types are wrong
function typeTest() {
  // Test 1: When stream: false is used, the result should be a string
  async function testStringType() {
    const result = await TestStreamComponent.run({
      foo: "test",
      stream: false,
    });

    // This should compile - result should be inferred as string
    const upper = result.toUpperCase();

    // @ts-expect-error - This should fail because strings don't have asyncIterator
    for await (const chunk of result) {
      console.log(chunk);
    }

    return upper;
  }

  // Test 2: When stream: true is used, the result should be Streamable
  async function testStreamableType() {
    const result = await TestStreamComponent.run({ foo: "test", stream: true });

    // @ts-expect-error - This should fail because Streamable doesn't have toUpperCase
    const upper = result.toUpperCase();

    // This should compile - result should be inferred as Streamable
    for await (const chunk of result) {
      console.log(chunk);
    }

    return result;
  }

  // Test 3: Default behavior (no stream specified) should return string
  async function testDefaultType() {
    const result = await TestStreamComponent.run({ foo: "test" });

    // This should compile - result should be inferred as string
    const upper = result.toUpperCase();

    return upper;
  }
}
