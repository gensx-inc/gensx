import path from "path";

import { gsx } from "@gensx/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMCPServerContext } from "@/index.js";
import { MCPTool } from "@/wrappers.js";

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

        const toolResponse = await tools[0].run({ message });
        return toolResponse.content[0].text as string;
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
    expect(result).toBe("Tool echo: test");
  });

  it("should create a context with Provider and useContext that provides access to resource templates", async () => {
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
        const { resourceTemplates } = useContext();
        expect(resourceTemplates).toBeDefined();
        expect(resourceTemplates.length).toBe(1);
        const resourceResponse = await resourceTemplates[0].read({ message });
        return resourceResponse.contents[0].text as string;
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
    expect(result).toBe("Resource echo: test");
  });

  it("should create a context with Provider and useContext that provides access to resources", async () => {
    const { Provider, useContext } = createMCPServerContext({
      clientName: "test-client",
      clientVersion: "1.0.0",
      serverCommand: "tsx",
      serverArgs: [path.join(__dirname, "echoMCPServer.ts")],
    });

    expect(Provider).toBeDefined();
    expect(useContext).toBeDefined();

    const TestComponent = gsx.Component<{}, string>(
      "TestComponent",
      async () => {
        const { resources } = useContext();
        expect(resources).toBeDefined();
        expect(resources.length).toBe(1);
        const resourceResponse = await resources[0].read();
        return resourceResponse.contents[0].text as string;
      },
    );

    const Wrapper = gsx.Component<{}, string>("Wrapper", () => (
      <Provider>
        <TestComponent />
      </Provider>
    ));

    const workflow = gsx.Workflow("TestWorkflow", Wrapper);

    const result = await workflow.run({});
    expect(result).toBe("Resource echo: helloWorld");
  });

  it("should create a context with Provider and useContext that provides access to prompts", async () => {
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
        const { prompts } = useContext();
        expect(prompts).toBeDefined();
        expect(prompts.length).toBe(1);
        const promptResponse = await prompts[0].get({ message });
        return promptResponse.messages[0].content.text as string;
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
    expect(result).toBe("Please process this message: test");
  });

  it("does not error if the server does not have all methods", async () => {
    const { Provider, useContext } = createMCPServerContext({
      clientName: "test-client",
      clientVersion: "1.0.0",
      serverCommand: "tsx",
      serverArgs: [path.join(__dirname, "partialEchoMCPServer.ts")],
    });

    expect(Provider).toBeDefined();
    expect(useContext).toBeDefined();

    const TestComponent = gsx.Component<{ message: string }, string>(
      "TestComponent",
      async () => {
        const { tools } = useContext();
        expect(tools).toBeDefined();
        expect(tools.length).toBe(1);

        const toolResponse = await tools[0].run({ message: "test" });
        return toolResponse.content[0].text as string;
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
    expect(result).toBe("Tool echo: test");
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

  it("does not disconnect a client that was provided by the server definition", async () => {
    const transport = new StdioClientTransport({
      command: "tsx",
      args: [path.join(__dirname, "echoMCPServer.ts")],
    });

    const onClientDisconnectSpy = vi.fn();

    const client = new Client({ name: "test-client", version: "1.0.0" });
    client.onclose = onClientDisconnectSpy;
    await client.connect(transport);

    const { Provider, useContext } = createMCPServerContext({
      client,
    });

    expect(Provider).toBeDefined();
    expect(useContext).toBeDefined();

    const TestComponent = gsx.Component<{ message: string }, string>(
      "TestComponent",
      async () => {
        const { tools } = useContext();
        expect(tools).toBeDefined();
        expect(tools.length).toBe(1);

        const toolResponse = await tools[0].run({ message: "test" });
        return toolResponse.content[0].text as string;
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
    expect(result).toBe("Tool echo: test");

    expect(onClientDisconnectSpy).not.toHaveBeenCalled();

    await client.close();
    expect(onClientDisconnectSpy).toHaveBeenCalled();
  });
});
