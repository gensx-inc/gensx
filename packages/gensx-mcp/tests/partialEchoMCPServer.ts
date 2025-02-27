import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "Echo",
  version: "1.0.0",
});

server.tool("echo", { message: z.string() }, ({ message }) => ({
  content: [{ type: "text", text: `Tool echo: ${message}` }],
}));

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Echo MCP Server running on stdio");
}

runServer().catch((error: unknown) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
