import { describe, expect, test } from "vitest";

import * as gensx from "../src/index";

// A simple StreamComponent for testing
const TestComponent = gensx.StreamComponent<{ input: string }>(
  "TestComponent",
  async function* ({ input }) {
    yield input;
  },
);

describe("stream component type inference", () => {
  test("infers string type when stream: false", async () => {
    // When using stream: false, the result should be typed as string
    const result = await TestComponent.run({
      input: "test",
      stream: false,
    });

    // This line would error if result wasn't inferred as string
    const upper: string = result.toUpperCase();
    expect(typeof result).toBe("string");
    expect(upper).toBe("TEST");
  });

  test("infers Streamable type when stream: true", async () => {
    // When using stream: true, the result should be typed as Streamable
    const result = await TestComponent.run({
      input: "test",
      stream: true,
    });

    // This line would error if result wasn't inferred as Streamable
    // We can check if it has the asyncIterator symbol
    expect(Symbol.asyncIterator in result).toBe(true);

    // Consume the stream
    let content = "";
    for await (const chunk of result) {
      content += chunk;
    }
    expect(content).toBe("test");
  });

  test("infers string type when stream is not specified", async () => {
    // By default (without specifying stream), the result should be typed as string
    const result = await TestComponent.run({
      input: "default",
    });

    // This line would error if result wasn't inferred as string
    const upper: string = result.toUpperCase();
    expect(typeof result).toBe("string");
    expect(upper).toBe("DEFAULT");
  });
});
