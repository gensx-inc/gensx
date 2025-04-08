import { Anthropic } from "@anthropic-ai/sdk";
import { MessageCreateParams } from "@anthropic-ai/sdk/resources/messages";
import * as gensx from "@gensx/core";
import { expect, suite, test, vi } from "vitest";

import {
  AnthropicChatCompletion,
  AnthropicContext,
  AnthropicProvider,
  ChatCompletion,
} from "../src/index.js";
import {
  createMockMessage,
  createMockStreamEvents,
  createMockTextContent,
} from "./helpers.js";

// Mock Anthropic client
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const originalAnthropicModule: Awaited<typeof import("@anthropic-ai/sdk")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockAnthropicClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  MockAnthropicClass.prototype = {
    messages: {
      create: vi.fn().mockImplementation((params: MessageCreateParams) => {
        if (params.stream === true) {
          return Promise.resolve(createMockStreamEvents("Hello World"));
        } else {
          return Promise.resolve(
            createMockMessage({
              content: createMockTextContent("Hello World"),
            }),
          );
        }
      }),
    },
  };

  return {
    ...originalAnthropicModule,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    default: MockAnthropicClass,
  };
});

suite("AnthropicContext", () => {
  test("provides Anthropic client to children", async () => {
    let capturedClient: Anthropic | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(AnthropicContext);
      capturedClient = context.client;
      return null;
    });

    await gensx.execute(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(capturedClient).toBeDefined();
  });

  test("throws error when client is not provided", async () => {
    const TestComponent = gensx.Component<{}, string>("TestComponent", () => (
      <AnthropicChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      />
    ));

    await expect(() => gensx.execute(<TestComponent />)).rejects.toThrow(
      "Anthropic client not found in context",
    );
  });

  test("can provide a custom client", async () => {
    const customClient = new Anthropic({ apiKey: "test" });

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(AnthropicContext);
      expect(context.client).toBe(customClient);
      return null;
    });

    await gensx.execute(
      <AnthropicContext.Provider value={{ client: customClient }}>
        <TestComponent />
      </AnthropicContext.Provider>,
    );
  });
});

suite("ChatCompletion", () => {
  test("handles streaming response", async () => {
    const TestComponent = gensx.StreamComponent<{}>("TestComponent", () => (
      <ChatCompletion
        stream={true}
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      />
    ));

    const result = await gensx.execute<gensx.Streamable>(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    let resultString = "";
    for await (const chunk of result) {
      resultString += chunk;
    }

    expect(resultString).toBe("Hello World ");
  });

  test("handles non-streaming response", async () => {
    const TestComponent = gensx.Component<{}, string>("TestComponent", () => (
      <ChatCompletion
        model="claude-3-5-sonnet-latest"
        messages={[{ role: "user", content: "test" }]}
        max_tokens={1000}
      >
        {(completion: string) => completion}
      </ChatCompletion>
    ));

    const result = await gensx.execute(
      <AnthropicProvider apiKey="test">
        <TestComponent />
      </AnthropicProvider>,
    );

    expect(result).toBe("Hello World");
  });
});
