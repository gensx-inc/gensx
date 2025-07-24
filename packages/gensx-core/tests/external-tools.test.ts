/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { Workflow } from "src/index.js";
import { describe, expect, it, vi } from "vitest";
import * as z3 from "zod/v3";
import * as z4 from "zod/v4";

import {
  createToolBox,
  executeExternalTool,
  InferToolParams,
  InferToolResult,
  ToolBox,
  ToolImplementations,
} from "../src/external-tools.js";

export function createToolImplementations<T extends ToolBox>(implementations: {
  [K in keyof T]: (
    params: InferToolParams<T, K>,
  ) => InferToolResult<T, K> | Promise<InferToolResult<T, K>>;
}): ToolImplementations<T> {
  return Object.fromEntries(
    Object.entries(implementations).map(([name, impl]) => [
      name,
      { execute: impl as unknown },
    ]),
  ) as ToolImplementations<T>;
}

describe("External Tools", () => {
  describe("createToolBox", () => {
    it("should create a tool box with proper types", () => {
      const toolBox = createToolBox({
        testTool: {
          params: z3.object({ text: z3.string() }),
          result: z3.string(),
        },
        mathTool: {
          params: z3.object({ a: z3.number(), b: z3.number() }),
          result: z3.number(),
        },
      });

      expect(toolBox).toEqual({
        testTool: {
          params: expect.any(Object), // Zod schema
          result: expect.any(Object), // Zod schema
        },
        mathTool: {
          params: expect.any(Object), // Zod schema
          result: expect.any(Object), // Zod schema
        },
      });
    });
  });

  describe("Type inference", () => {
    it("should properly infer parameter and result types", () => {
      const toolDef = {
        params: z3.object({
          name: z3.string(),
          age: z3.number().optional(),
        }),
        result: z3.object({
          greeting: z3.string(),
          canVote: z3.boolean(),
        }),
      };
      const tools = createToolBox({
        testTool: toolDef,
      });

      // These are compile-time tests - they should not cause TypeScript errors
      type Params = InferToolParams<typeof tools, "testTool">;
      type Result = InferToolResult<typeof tools, "testTool">;

      // Runtime verification that the types work correctly
      const params: Params = { name: "John", age: 25 };
      const result: Result = { greeting: "Hello John", canVote: true };

      expect(params.name).toBe("John");
      expect(params.age).toBe(25);
      expect(result.greeting).toBe("Hello John");
      expect(result.canVote).toBe(true);
    });

    it("should properly infer parameter and result types for zod v4", () => {
      const toolDef = {
        params: z4.object({
          name: z4.string(),
          age: z4.number().optional(),
        }),
        result: z4.object({
          greeting: z4.string(),
          canVote: z4.boolean(),
        }),
      };
      const tools = createToolBox({
        testTool: toolDef,
      });

      // These are compile-time tests - they should not cause TypeScript errors
      type Params = InferToolParams<typeof tools, "testTool">;
      type Result = InferToolResult<typeof tools, "testTool">;

      // Runtime verification that the types work correctly
      const params: Params = { name: "John", age: 25 };
      const result: Result = { greeting: "Hello John", canVote: true };

      expect(params.name).toBe("John");
      expect(params.age).toBe(25);
      expect(result.greeting).toBe("Hello John");
      expect(result.canVote).toBe(true);
    });
  });

  describe("executeExternalTool", () => {
    it("should send external tool call message with validated params", async () => {
      const toolBox = createToolBox({
        testTool: {
          params: z3.object({ text: z3.string() }),
          result: z3.string(),
        },
      });

      const onRequestInput = vi.fn();
      const workflow = Workflow("TestWorkflow", async () => {
        return await executeExternalTool(toolBox, "testTool", {
          text: "Hello",
        });
      });

      let messages: any[] = [];

      await workflow(
        {
          text: "Hello",
        },
        {
          onRequestInput,
          messageListener: (message) => messages.push(message),
        },
      );

      const externalToolMessage = messages.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (m) => m.type === "external-tool",
      );

      expect(externalToolMessage).toBeDefined();
      expect(externalToolMessage).toMatchObject({
        type: "external-tool",
        toolName: "testTool",
        params: { text: "Hello" },
        paramsSchema: expect.any(Object),
        resultSchema: expect.any(Object),
        timeoutAt: null,
        nodeId: expect.stringMatching(
          /^TestWorkflow-ExternalTool:[a-z0-9-]+:\d+$/,
        ),
      });
    });

    it("should validate params against schema", async () => {
      const toolBox = createToolBox({
        strictTool: {
          params: z3.object({
            requiredString: z3.string(),
            requiredNumber: z3.number(),
          }),
          result: z3.string(),
        },
      });

      const workflow = Workflow("TestWorkflow", async () => {
        // @ts-expect-error - wrong type
        return await executeExternalTool(toolBox, "strictTool", {
          requiredString: "test",
        });
      });

      // Should throw validation error for invalid params
      await expect(() => workflow()).rejects.toThrow(); // Missing requiredNumber
    });

    it("should include timeout information when timeoutMs is provided", async () => {
      const toolBox = createToolBox({
        testTool: {
          params: z3.object({ text: z3.string() }),
          result: z3.string(),
        },
      });

      const onRequestInput = vi.fn();
      const workflow = Workflow("TestWorkflow", async () => {
        return await executeExternalTool(
          toolBox,
          "testTool",
          { text: "Hello" },
          { timeoutMs: 5000 }
        );
      });

      let messages: any[] = [];

      await workflow(
        {
          text: "Hello",
        },
        {
          onRequestInput,
          messageListener: (message) => messages.push(message),
        },
      );

      const externalToolMessage = messages.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (m) => m.type === "external-tool",
      );

      expect(externalToolMessage).toBeDefined();
      expect(externalToolMessage).toMatchObject({
        type: "external-tool",
        toolName: "testTool",
        params: { text: "Hello" },
        paramsSchema: expect.any(Object),
        resultSchema: expect.any(Object),
        timeoutAt: expect.any(String),
        nodeId: expect.stringMatching(
          /^TestWorkflow-ExternalTool:[a-z0-9-]+:\d+$/,
        ),
      });

      // Verify timeoutAt is a valid ISO string representing a future date
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const timeoutAt = new Date(externalToolMessage.timeoutAt as string);
      expect(timeoutAt.getTime()).toBeGreaterThan(Date.now());
    });

    it("should include timeout information when timeoutAt is provided", async () => {
      const futureDate = new Date(Date.now() + 10000);
      const toolBox = createToolBox({
        testTool: {
          params: z3.object({ text: z3.string() }),
          result: z3.string(),
        },
      });

      const onRequestInput = vi.fn();
      const workflow = Workflow("TestWorkflow", async () => {
        return await executeExternalTool(
          toolBox,
          "testTool",
          { text: "Hello" },
          { timeoutAt: futureDate }
        );
      });

      let messages: any[] = [];

      await workflow(
        {
          text: "Hello",
        },
        {
          onRequestInput,
          messageListener: (message) => messages.push(message),
        },
      );

      const externalToolMessage = messages.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (m) => m.type === "external-tool",
      );

      expect(externalToolMessage).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(externalToolMessage.timeoutAt).toBe(futureDate.toISOString());
    });
  });

  describe("Integration tests", () => {
    it("should work end-to-end with realistic tool definitions", () => {
      // Define a realistic set of tools
      const toolBox = createToolBox({
        promptUser: {
          params: z3.object({
            text: z3.string(),
            defaultValue: z3.string().optional(),
          }),
          result: z3.string(),
        },
        calculateStats: {
          params: z3.object({
            numbers: z3.array(z3.number()),
          }),
          result: z3.object({
            sum: z3.number(),
            average: z3.number(),
            count: z3.number(),
          }),
        },
      });

      // Create implementations
      const tools = createToolImplementations<typeof toolBox>({
        promptUser: (params) => {
          return params.defaultValue ?? `User input for: ${params.text}`;
        },
        calculateStats: (params) => {
          const sum = params.numbers.reduce((a, b) => a + b, 0);
          return {
            sum,
            average: sum / params.numbers.length,
            count: params.numbers.length,
          };
        },
      });

      // Test the tools
      expect(tools.promptUser.execute({ text: "What's your name?" })).toBe(
        "User input for: What's your name?",
      );

      expect(
        tools.calculateStats.execute({ numbers: [1, 2, 3, 4, 5] }),
      ).toEqual({
        sum: 15,
        average: 3,
        count: 5,
      });
    });
  });
});
