import { gsx, Streamable } from "@gensx/core";
import OpenAI from "openai";
import { expect, suite, test } from "vitest";

import { ChatCompletion, OpenAIContext, OpenAIProvider } from "@/index.js";

suite("OpenAIContext", () => {
  test("provides OpenAI client to children", async () => {
    let capturedClient: OpenAI | undefined;

    const TestComponent = gsx.Component<{}, null>("TestComponent", () => {
      const context = gsx.useContext(OpenAIContext);
      capturedClient = context.client;
      return null;
    });

    await gsx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(capturedClient).toBeDefined();
  });

  test("throws error when client is not provided", async () => {
    const TestComponent = gsx.Component<{}, string>("TestComponent", () => (
      <ChatCompletion
        model="gpt-4"
        messages={[{ role: "user", content: "test" }]}
      />
    ));

    await expect(() => gsx.execute(<TestComponent />)).rejects.toThrow(
      "OpenAI client not found in context",
    );
  });

  test("can provide a custom client", async () => {
    const customClient = new OpenAI({ apiKey: "test" });

    const TestComponent = gsx.Component<{}, null>("TestComponent", () => {
      const context = gsx.useContext(OpenAIContext);
      expect(context.client).toBe(customClient);
      return null;
    });

    await gsx.execute(
      <OpenAIContext.Provider value={{ client: customClient }}>
        <TestComponent />
      </OpenAIContext.Provider>,
    );
  });
});

suite("ChatCompletion", () => {
  test("handles streaming response", async () => {
    const TestComponent = gsx.StreamComponent<{}>("TestComponent", () => (
      <ChatCompletion
        stream={true}
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
      />
    ));

    const result = await gsx.execute<Streamable>(
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
    const TestComponent = gsx.Component<{}, string>("TestComponent", () => (
      <ChatCompletion
        model="gpt-4o"
        messages={[{ role: "user", content: "test" }]}
      >
        {(completion: string) => completion}
      </ChatCompletion>
    ));

    const result = await gsx.execute(
      <OpenAIProvider apiKey="test">
        <TestComponent />
      </OpenAIProvider>,
    );

    expect(result).toBe("Hello World");
  });
});
