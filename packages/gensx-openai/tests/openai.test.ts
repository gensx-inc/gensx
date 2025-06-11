import * as gensx from "@gensx/core";
import { OpenAI } from "openai";
import { expect, suite, test } from "vitest";

import { wrapOpenAI } from "../src/openai.js";

suite("OpenAI Wrapper (smoke)", () => {
  test("should not throw when calling chat.completions.create", async () => {
    const client = new OpenAI();
    const wrappedClient = wrapOpenAI(client);
    const result = await wrappedClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result).toBeDefined();
  });

  test("should not throw when calling chat.completions.create with more options", async () => {
    const client = new OpenAI();
    const wrappedClient = wrapOpenAI(client);
    const result = await wrappedClient.chat.completions.create({
      model: "gpt-4",
      temperature: 0.7,
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result).toBeDefined();
  });

  test("should not throw when calling with a different base URL", async () => {
    const client = new OpenAI({
      baseURL: "https://api.anthropic.com/v1",
    });
    const wrappedClient = wrapOpenAI(client);

    const result = await wrappedClient.chat.completions.create({
      model: "claude-3-opus-20240229",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result).toBeDefined();
  });

  test("should handle streaming responses", async () => {
    const client = new OpenAI();
    const wrappedClient = wrapOpenAI(client);

    const result = await wrappedClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });

    expect(result).toBeDefined();
    // The result should be an async iterable when streaming
    expect(typeof result[Symbol.asyncIterator]).toBe("function");
  });

  test("should debug streaming in GenSX workflow", async () => {
    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const client = new OpenAI();
      const wrappedClient = wrapOpenAI(client);

      console.info("🔥 About to call streaming completion");
      const result = await wrappedClient.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      });

      console.info("🔥 Got result:", typeof result);
      return result;
    });

    const result = await TestWorkflow();
    expect(result).toBeDefined();
  });
});
