import * as gensx from "@gensx/core";
import { expect, suite, test } from "vitest";
import { z } from "zod";

import { GSXChatCompletion, OpenAIProvider } from "@/index.js";
import { StructuredOutput } from "@/structured-output.js";

suite("StructuredOutput", () => {
  test("structured output works with `StructuredOutput` component", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const TestComponent = gensx.Component("TestComponent", () => (
      <StructuredOutput
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
      />
    ));

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });

  test("structured output works with `GSXChatCompletion` component", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const TestComponent = gensx.Component("TestComponent", () => (
      <GSXChatCompletion
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
      />
    ));

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });

  test("structured output gets passed to the child function", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const Wrapper = gensx.Component<
      {},
      {
        uppercase: string;
        doubleAge: number;
      }
    >("Wrapper", () => {
      return (
        <GSXChatCompletion
          model="gpt-4o"
          messages={[{ role: "user", content: "test" }]}
          outputSchema={schema}
        >
          {(result) => {
            return {
              uppercase: result.name.toUpperCase(),
              doubleAge: result.age * 2,
            };
          }}
        </GSXChatCompletion>
      );
    });

    const result = await gensx.execute<{
      uppercase: string;
      doubleAge: number;
    }>(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toEqual({
      uppercase: "HELLO WORLD",
      doubleAge: 84,
    });
  });

  test("structured output works with `GSXChatCompletion` component with `run` method", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const Wrapper = gensx.Component<{}, z.infer<typeof schema>>(
      "Wrapper",
      async () => {
        // add a type assertion to ensure the result is of the expected type
        const result: z.infer<typeof schema> = await GSXChatCompletion.run({
          model: "gpt-4o",
          messages: [{ role: "user", content: "test" }],
          outputSchema: schema,
        });

        return result;
      },
    );

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });

  test("structured output works with the `structuredOutputStrategy` prop set to tools", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const TestComponent = gensx.Component("TestComponent", () => (
      <GSXChatCompletion
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
        structuredOutputStrategy="tools"
      />
    ));

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });

  test("structured output works with the `structuredOutputStrategy` prop set to response_format", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const TestComponent = gensx.Component("TestComponent", () => (
      <GSXChatCompletion
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
        structuredOutputStrategy="response_format"
      />
    ));

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });
});
