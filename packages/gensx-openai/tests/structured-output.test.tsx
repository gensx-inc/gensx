import { gsx } from "gensx";
import { ChatCompletionCreateParams } from "openai/resources/index.mjs";
import { expect, suite, test, vi } from "vitest";
import { z } from "zod";

import { GSXChatCompletion, OpenAIProvider } from "@/index.js";
import { StructuredOutput } from "@/structured-output.js";

vi.mock("openai", async (importOriginal) => {
  const originalOpenAI: Awaited<typeof import("openai")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockedOpenAIClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  mockedOpenAIClass.prototype = {
    chat: {
      completions: {
        create: vi
          .fn()
          .mockImplementation((params: ChatCompletionCreateParams) => {
            // Handle structured output
            if (params.response_format?.type === "json_schema") {
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        name: "Hello World",
                        age: 42,
                      }),
                    },
                  },
                ],
              });
            } else {
              return Promise.resolve({
                choices: [
                  {
                    message: { content: "Hello World" },
                  },
                ],
              });
            }
          }),
      },
    },
  };

  return {
    ...originalOpenAI,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: mockedOpenAIClass,
  };
});

suite("StructuredOutput", () => {
  test("structured output works with `StructuredOutput` component", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const TestComponent = gsx.Component("TestComponent", () => (
      <StructuredOutput
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
      />
    ));

    const result = await gsx.execute(
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

    const TestComponent = gsx.Component("TestComponent", () => (
      <GSXChatCompletion
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
        outputSchema={schema}
      />
    ));

    const result = await gsx.execute(
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

    const Wrapper = gsx.Component<
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

    const result = await gsx.execute<{
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

    const Wrapper = gsx.Component<{}, z.infer<typeof schema>>(
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

    const result = await gsx.execute(
      <OpenAIProvider apiKey="test">
        <Wrapper />
      </OpenAIProvider>,
    );

    expect(result).toEqual({ name: "Hello World", age: 42 });
  });
});
