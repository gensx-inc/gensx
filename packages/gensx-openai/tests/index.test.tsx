import * as gensx from "@gensx/core";
import { Streamable } from "@gensx/core";
import OpenAI from "openai";
import { expect, suite, test } from "vitest";

import { ChatCompletion, OpenAIContext, OpenAIProvider } from "@/index.js";

suite("OpenAIContext", () => {
  test("provides OpenAI client to children", async () => {
    let capturedClient: OpenAI | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(OpenAIContext);
      capturedClient = context.client;
      return null;
    });

    await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(capturedClient).toBeDefined();
  });

  test("Does not throw error when client is not provided", async () => {
    const TestComponent = gensx.Component<{}, string>("TestComponent", () => (
      <ChatCompletion
        model="gpt-4"
        messages={[{ role: "user", content: "test" }]}
      />
    ));

    expect(async () => await gensx.execute(<TestComponent />)).not.toThrow(
      "OpenAI client not found in context",
    );
  });

  test("can provide a custom client", async () => {
    const customClient = new OpenAI({ apiKey: "test" });

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(OpenAIContext);
      expect(context.client).toBe(customClient);
      return null;
    });

    await gensx.execute(
      <OpenAIContext.Provider value={{ client: customClient }}>
        <TestComponent />
      </OpenAIContext.Provider>,
    );
  });
});

suite("ChatCompletion", () => {
  test("handles streaming response", async () => {
    const TestComponent = gensx.StreamComponent<{}>("TestComponent", () => (
      <ChatCompletion
        stream={true}
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
      />
    ));

    const result = await gensx.execute<Streamable>(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
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
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
      >
        {(completion: string) => completion}
      </ChatCompletion>
    ));

    const result = await gensx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toBe("Hello World");
  });
});
