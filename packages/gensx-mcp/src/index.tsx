import * as gensx from "@gensx/core";

import { fetchMcpContext, MCPServerDefinition } from "./mcp.js";
import {
  MCPPrompt,
  MCPResource,
  MCPResourceTemplate,
  MCPTool,
} from "./wrappers.js";

export { MCPTool, MCPResource, MCPResourceTemplate, MCPPrompt };
export interface MCPServerContext {
  tools: MCPTool[];
  resources: MCPResource[];
  resourceTemplates: MCPResourceTemplate[];
  prompts: MCPPrompt[];
}

// Define the return type explicitly to avoid exposing internal types
interface MCPServerContextResult {
  useContext: () => MCPServerContext;
  Provider: gensx.GsxComponent<{}, never>;
}

export const createMCPServerContext = (
  serverDefinition: MCPServerDefinition,
): MCPServerContextResult => {
  const context = gensx.createContext<MCPServerContext | null>(null);

  const Provider = gensx.Component<{}, never>(
    `MCPServerProvider`,
    async () => {
      const { client, closeOnComplete, ...rest } =
        await fetchMcpContext(serverDefinition);

      const onComplete = () => {
        if (closeOnComplete) {
          void client.close();
        }
      };

      return <context.Provider value={rest} onComplete={onComplete} />;
    },
    {
      metadata: {
        serverCommand:
          "client" in serverDefinition
            ? `[Client Provided by Server Definition]`
            : `${serverDefinition.serverCommand} ${serverDefinition.serverArgs.join(
                " ",
              )}`,
      },
    },
  );

  const useContext = () => {
    const loadedContext = gensx.useContext(context);
    if (!loadedContext) {
      throw new Error("MCPServerContext not found");
    }
    return loadedContext;
  };

  return {
    Provider,
    useContext,
  };
};
