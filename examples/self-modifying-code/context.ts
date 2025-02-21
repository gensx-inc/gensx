import fs from "fs/promises";
import path from "path";

interface FileSystemError extends Error {
  code?: string;
}

export interface AgentContext {
  goalState: string;
  history: {
    timestamp: Date;
    action: string;
    result: "success" | "failure";
    details: string;
  }[];
}

function serializeContext(context: AgentContext): string {
  return JSON.stringify(
    context,
    (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2,
  );
}

function deserializeContext(json: string): AgentContext {
  return JSON.parse(json, (key, value) => {
    if (key === "timestamp" && typeof value === "string") {
      return new Date(value);
    }
    return value;
  });
}

export async function readContext(contextFile: string): Promise<AgentContext> {
  try {
    const content = await fs.readFile(contextFile, "utf-8");
    return deserializeContext(content);
  } catch (e) {
    if ((e as FileSystemError).code === "ENOENT") {
      // Create default context if file doesn't exist
      const defaultContext: AgentContext = {
        goalState: "Improve code quality and efficiency",
        history: [],
      };
      await writeContext(contextFile, defaultContext);
      return defaultContext;
    }
    throw e;
  }
}

export async function writeContext(
  contextFile: string,
  context: AgentContext,
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(contextFile), { recursive: true });
  await fs.writeFile(contextFile, serializeContext(context));
}

export async function updateContext(
  contextFile: string,
  update: Partial<AgentContext>,
): Promise<AgentContext> {
  const current = await readContext(contextFile);

  const updated: AgentContext = {
    ...current,
    ...update,
    history: update.history
      ? [...current.history, ...update.history]
      : current.history,
  };

  await writeContext(contextFile, updated);
  return updated;
}

export async function addHistoryEntry(
  contextFile: string,
  action: string,
  result: "success" | "failure",
  details: string,
): Promise<AgentContext> {
  const entry = {
    timestamp: new Date(),
    action,
    result,
    details,
  };

  return updateContext(contextFile, {
    history: [entry],
  });
}
