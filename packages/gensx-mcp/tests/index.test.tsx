/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { gsx } from "gensx";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createMCPServerContext, MCPTool } from "../src/index";

// Mock the MCP SDK
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  return {
    Client: vi.fn().mockImplementation(() => ({
      connect: vi.fn().mockResolvedValue(undefined),
      listTools: vi.fn().mockResolvedValue({
        tools: [
          {
            name: "testTool",
            description: "A test tool",
            inputSchema: {
              type: "object",
              properties: {
                testParam: {
                  type: "string",
                  description: "A test parameter",
                },
              },
            },
          },
        ],
      }),
      callTool: vi.fn().mockResolvedValue({ result: "success" }),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
  return {
    StdioClientTransport: vi.fn().mockImplementation(() => ({
      // Mock implementation of StdioClientTransport
    })),
  };
});

describe("createMCPServerContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a context with Provider and useContext that provides access to tools", async () => {
    const { Provider, useContext } = createMCPServerContext({
      clientName: "test-client",
      clientVersion: "1.0.0",
      serverCommand: "tsx",
      serverArgs: [path.join(__dirname, "echoMCPServer.ts")],
    });

    expect(Provider).toBeDefined();
    expect(useContext).toBeDefined();

    const TestComponent = gsx.Component<{ message: string }, string>(
      "TestComponent",
      async ({ message }) => {
        const { tools } = useContext();
        expect(tools).toBeDefined();
        expect(tools.length).toBe(1);
        expect(tools[0]).toBeInstanceOf(MCPTool);

        const toolResponse = (await tools[0].run({ testParam: message })) as {
          result: string;
        };
        return toolResponse.result;
      },
    );

    const Wrapper = gsx.Component<{ message: string }, string>(
      "Wrapper",
      ({ message }) => (
        <Provider>
          <TestComponent message={message} />
        </Provider>
      ),
    );

    const workflow = gsx.Workflow("TestWorkflow", Wrapper);

    const result = await workflow.run({ message: "test" });
    expect(result).toBe("success");
  });

  it("should throw an error if context is not found", () => {
    // Create a spy on console.error to suppress expected error messages
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        /* do nothing */
      });

    const { useContext } = createMCPServerContext({
      clientName: "test-client",
      clientVersion: "1.0.0",
      serverCommand: "test-command",
      serverArgs: ["--test"],
    });

    expect(() => useContext()).toThrow();

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});

describe("MCPTool", () => {
  let mockClient: Pick<Client, "callTool">;

  beforeEach(() => {
    mockClient = {
      callTool: vi.fn().mockResolvedValue({ result: "success" }),
    };
  });

  it("should create a tool with name and description", () => {
    const tool = new MCPTool(
      mockClient as unknown as Client,
      "testTool",
      "A test tool",
    );

    expect(tool.name).toBe("testTool");
    expect(tool.description).toBe("A test tool");
    expect(tool.schema).toBeDefined();
  });

  it("should create a tool with input schema", () => {
    // Use type assertion to satisfy the type checker
    const tool = new MCPTool(
      mockClient as unknown as Client,
      "testTool",
      "A test tool",

      {
        type: "object",
        properties: {
          testParam: {
            type: "string",
            description: "A test parameter",
          },
        },
      } as any,
    );

    expect(tool.schema).toBeDefined();
    // Validate that the schema is a zod object
    expect(tool.schema instanceof z.ZodObject).toBe(true);
  });

  it("should run the tool with parameters", async () => {
    const tool = new MCPTool(
      mockClient as unknown as Client,
      "testTool",
      "A test tool",
    );

    const result = await tool.run({ testParam: "test value" });

    expect(mockClient.callTool).toHaveBeenCalledWith({
      name: "testTool",
      arguments: { testParam: "test value" },
    });
    expect(result).toEqual({ result: "success" });
  });

  it("should handle tool call errors", async () => {
    // Setup a mock client that rejects
    const errorClient = {
      callTool: vi.fn().mockRejectedValue(new Error("Tool call failed")),
    };

    const tool = new MCPTool(
      errorClient as unknown as Client,
      "testTool",
      "A test tool",
    );

    // Expect the run method to reject with the same error
    await expect(tool.run({ testParam: "test value" })).rejects.toThrow(
      "Tool call failed",
    );
  });
});

describe("translateJsonSchemaToZodSchema", () => {
  // We can test this indirectly through the MCPTool class

  it("should translate object schema", () => {
    // Use type assertion to satisfy the type checker
    const tool = new MCPTool(
      {} as unknown as Client,
      "testTool",
      "A test tool",

      {
        type: "object",
        properties: {
          stringProp: { type: "string" },
          numberProp: { type: "number" },
          booleanProp: { type: "boolean" },
        },
      } as any,
    );

    // Validate schema structure
    const schema = tool.schema;
    expect(schema.shape).toBeDefined();
    expect(schema.shape.stringProp instanceof z.ZodString).toBe(true);
    expect(schema.shape.numberProp instanceof z.ZodNumber).toBe(true);
    expect(schema.shape.booleanProp instanceof z.ZodBoolean).toBe(true);
  });

  it("should handle unknown types with any", () => {
    // Use type assertion to satisfy the type checker
    const tool = new MCPTool(
      {} as unknown as Client,
      "testTool",
      "A test tool",

      {
        type: "unknown",
        properties: {},
      } as any,
    );

    // Should default to z.any() for unknown types
    expect(tool.schema).toBeDefined();
  });

  it("should handle nested object schemas", () => {
    // Use type assertion to satisfy the type checker
    const tool = new MCPTool(
      {} as unknown as Client,
      "testTool",
      "A test tool",

      {
        type: "object",
        properties: {
          nestedObject: {
            type: "object",
            properties: {
              nestedString: { type: "string" },
            },
          },
        },
      } as any,
    );

    // Validate schema structure
    const schema = tool.schema;
    expect(schema.shape).toBeDefined();
    expect(schema.shape.nestedObject instanceof z.ZodObject).toBe(true);

    // Access the nested schema

    const nestedSchema = schema.shape.nestedObject as z.ZodObject<any>;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(nestedSchema.shape.nestedString instanceof z.ZodString).toBe(true);
  });

  it("should handle arrays and complex types", () => {
    // This test is to verify that the translateJsonSchemaToZodSchema function
    // can handle more complex schemas, even though it's not fully implemented yet

    // Use type assertion to satisfy the type checker
    const tool = new MCPTool(
      {} as unknown as Client,
      "testTool",
      "A test tool",

      {
        type: "object",
        properties: {
          // Even though arrays aren't properly supported yet, the function should
          // at least not crash when encountering them
          arrayProp: { type: "array" },
          // Same for other unsupported types
          nullProp: { type: "null" },
        },
      } as any,
    );

    // Just verify the schema was created without errors
    expect(tool.schema).toBeDefined();
    expect(tool.schema instanceof z.ZodObject).toBe(true);
  });
});

// We'll skip the integration test since it would require a real Provider
// which would try to connect to a real MCP server
// Instead, we'll add a test for the MCPTool class's functionality
describe("MCPTool additional functionality", () => {
  it("should handle empty input schema", () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({ result: "success" }),
    };

    const tool = new MCPTool(
      mockClient as unknown as Client,
      "testTool",
      "A test tool",
      // No input schema provided
    );

    expect(tool.schema).toBeDefined();
    // Should default to an empty object schema
    expect(tool.schema instanceof z.ZodObject).toBe(true);
    expect(Object.keys(tool.schema.shape).length).toBe(0);
  });

  it("should handle undefined description", () => {
    const mockClient = {
      callTool: vi.fn().mockResolvedValue({ result: "success" }),
    };

    const tool = new MCPTool(
      mockClient as unknown as Client,
      "testTool",
      // No description provided
    );

    expect(tool.name).toBe("testTool");
    expect(tool.description).toBeUndefined();
    expect(tool.schema).toBeDefined();
  });
});
