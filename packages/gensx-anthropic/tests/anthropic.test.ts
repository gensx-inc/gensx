import { Anthropic } from "@anthropic-ai/sdk";
import { expect, suite, test, vi } from "vitest";

import { wrapAnthropic } from "../src/anthropic.js";

// Mock Anthropic client
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const originalAnthropicModule: Awaited<typeof import("@anthropic-ai/sdk")> =
    await importOriginal();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockAnthropicClass: any = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  MockAnthropicClass.prototype = {
    messages: {
      create: vi.fn().mockImplementation(() => {
        return Promise.resolve({
          content: [{ type: "text", text: "Hello World" }],
        });
      }),
    },
  };

  return {
    ...originalAnthropicModule,
    default: MockAnthropicClass as unknown as Anthropic,
    Anthropic: MockAnthropicClass as unknown as Anthropic,
  };
});

suite("Anthropic Wrapper (smoke)", () => {
  test("should not throw when calling messages.create", async () => {
    const client = new Anthropic({ apiKey: "test" });
    const wrappedClient = wrapAnthropic(client);
    await expect(
      wrappedClient.messages.create({
        model: "claude-3-sonnet-20240229",
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      }),
    ).resolves.not.toThrow();
  });

  test("should not throw when calling messages.create with more options", async () => {
    const client = new Anthropic({ apiKey: "test" });
    const wrappedClient = wrapAnthropic(client);
    await expect(
      wrappedClient.messages.create({
        model: "claude-3-sonnet-20240229",
        temperature: 0.7,
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 1000,
      }),
    ).resolves.not.toThrow();
  });
});
