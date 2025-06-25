/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { getCurrentContext } from "../src/context.js";
import {
  createToolImplementations,
  createToolBox,
  executeExternalTool,
  InferToolParams,
  InferToolResult,
} from "../src/external-tools.js";

// Mock the context
vi.mock("../src/context.js", () => ({
  getCurrentContext: vi.fn(),
}));

describe("External Tools", () => {
  describe("createToolBox", () => {
    it("should create a tool box with proper types", () => {
      const toolBox = createToolBox({
        testTool: {
          params: z.object({ text: z.string() }),
          result: z.string(),
        },
        mathTool: {
          params: z.object({ a: z.number(), b: z.number() }),
          result: z.number(),
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

  describe("createToolImplementations", () => {
    it("should create tool implementations with proper structure", () => {
      const toolBox = createToolBox({
        promptUser: {
          params: z.object({ text: z.string() }),
          result: z.string(),
        },
        calculateSum: {
          params: z.object({ a: z.number(), b: z.number() }),
          result: z.number(),
        },
      });

      const tools = createToolImplementations<typeof toolBox>({
        promptUser: (params) => `You said: ${params.text}`,
        calculateSum: (params) => params.a + params.b,
      });

      expect(tools).toEqual({
        promptUser: {
          execute: expect.any(Function),
        },
        calculateSum: {
          execute: expect.any(Function),
        },
      });
    });

    it("should execute tool implementations correctly", async () => {
      const toolBox = createToolBox({
        promptUser: {
          params: z.object({ text: z.string() }),
          result: z.string(),
        },
        calculateSum: {
          params: z.object({ a: z.number(), b: z.number() }),
          result: z.number(),
        },
      });

      const tools = createToolImplementations<typeof toolBox>({
        promptUser: (params) => `You said: ${params.text}`,
        calculateSum: async (params) => params.a + params.b,
      });

      // Test sync tool
      const promptResult = await tools.promptUser.execute({ text: "Hello" });
      expect(promptResult).toBe("You said: Hello");

      // Test async tool
      const mathResult = await tools.calculateSum.execute({ a: 5, b: 3 });
      expect(mathResult).toBe(8);
    });
  });

  describe("Type inference", () => {
    it("should properly infer parameter and result types", () => {
      const toolDef = {
        params: z.object({ 
          name: z.string(), 
          age: z.number().optional() 
        }),
        result: z.object({ 
          greeting: z.string(),
          canVote: z.boolean()
        }),
      };

      // These are compile-time tests - they should not cause TypeScript errors
      type Params = InferToolParams<typeof toolDef>;
      type Result = InferToolResult<typeof toolDef>;

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
    let mockContext: any;
    let mockWorkflowContext: any;

    beforeEach(() => {
      mockWorkflowContext = {
        sendWorkflowMessage: vi.fn(),
      };

      mockContext = {
        getWorkflowContext: () => mockWorkflowContext,
        getCurrentNodeId: () => "test-node-123",
      };

      vi.mocked(getCurrentContext).mockReturnValue(mockContext);
    });

    it("should send external tool call message with validated params", async () => {
      const toolBox = createToolBox({
        testTool: {
          params: z.object({ text: z.string() }),
          result: z.string(),
        },
      });

      // This will reject with our placeholder error, but we can test the message sending
      try {
        await executeExternalTool(toolBox, "testTool", { text: "Hello" });
      } catch (_error) {
        expect(_error).toBeInstanceOf(Error);
        expect((_error as Error).message).toContain("not yet implemented");
      }

      // Verify the message was sent
      expect(mockWorkflowContext.sendWorkflowMessage).toHaveBeenCalledWith({
        type: "external-tool-call",
        toolName: "testTool",
        params: { text: "Hello" },
        callId: expect.stringMatching(/^testTool-\d+-[a-z0-9]+$/),
        nodeId: "test-node-123",
        sequenceNumber: expect.any(Number),
      });
    });

    it("should validate params against schema", async () => {
      const toolBox = createToolBox({
        strictTool: {
          params: z.object({ 
            requiredString: z.string(),
            requiredNumber: z.number()
          }),
          result: z.string(),
        },
      });

      // Should throw validation error for invalid params
      await expect(() =>
        executeExternalTool(toolBox, "strictTool", { requiredString: "test" })
      ).rejects.toThrow(); // Missing requiredNumber

      await expect(() =>
        executeExternalTool(toolBox, "strictTool", { 
          requiredString: 123, // Wrong type
          requiredNumber: 456 
        })
      ).rejects.toThrow();
    });

    it("should handle missing node ID gracefully", async () => {
      mockContext.getCurrentNodeId = () => undefined;

      const toolBox = createToolBox({
        testTool: {
          params: z.object({}),
          result: z.string(),
        },
      });

      try {
        await executeExternalTool(toolBox, "testTool", {});
      } catch (error) {
        // Expected error from placeholder implementation
      }

      expect(mockWorkflowContext.sendWorkflowMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          nodeId: "unknown",
        })
      );
    });
  });

  describe("Integration tests", () => {
    it("should work end-to-end with realistic tool definitions", () => {
      // Define a realistic set of tools
      const toolBox = createToolBox({
        promptUser: {
          params: z.object({ 
            text: z.string(),
            defaultValue: z.string().optional() 
          }),
          result: z.string(),
        },
        uploadFile: {
          params: z.object({ 
            file: z.instanceof(File),
            description: z.string().optional()
          }),
          result: z.object({ 
            id: z.string(), 
            url: z.string(),
            filename: z.string()
          }),
        },
        calculateStats: {
          params: z.object({ 
            numbers: z.array(z.number()) 
          }),
          result: z.object({
            sum: z.number(),
            average: z.number(),
            count: z.number()
          }),
        },
      });

      // Create implementations
      const tools = createToolImplementations<typeof toolBox>({
        promptUser: (params) => {
          return params.defaultValue ?? `User input for: ${params.text}`;
        },
        uploadFile: (params) => {
          return Promise.resolve({
            id: `file-${Date.now()}`,
            url: `https://example.com/files/${params.file.name}`,
            filename: params.file.name,
          });
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
      expect(tools.promptUser.execute({ text: "What's your name?" }))
        .toBe("User input for: What's your name?");

      expect(tools.calculateStats.execute({ numbers: [1, 2, 3, 4, 5] }))
        .toEqual({
          sum: 15,
          average: 3,
          count: 5,
        });
    });
  });
});