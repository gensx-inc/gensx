// Platform-agnostic file operations
async function writeFileSafe(path: string, data: string): Promise<void> {
  const isNode = typeof process !== "undefined";

  if (isNode) {
    // Node.js environment
    try {
      const { writeFile } = await import("fs/promises");
      await writeFile(path, data);
    } catch (error) {
      console.error(`[Tracker] Failed to write file:`, { path, error });
      throw error;
    }
  } else {
    // Browser environment - could implement browser-specific storage here
    console.warn(
      "[Tracker] File writing is not supported in browser environment",
    );
  }
}

// Cross-platform UUID generation
async function generateUUID(): Promise<string> {
  try {
    // Try Node.js crypto first
    const crypto = await import("node:crypto");
    return crypto.randomUUID();
  } catch {
    // Fallback to browser crypto
    if (typeof globalThis !== "undefined") {
      return globalThis.crypto.randomUUID();
    }
    // Simple fallback for environments without crypto
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export interface ExecutionNode {
  id: string;
  componentName: string;
  parentId?: string;
  startTime: number;
  endTime?: number;
  props: Record<string, unknown>;
  output?: unknown;
  children: ExecutionNode[];
  metadata?: {
    logs?: string[];
    tokenCounts?: {
      input: number;
      output: number;
    };
    [key: string]: unknown;
  };
}

export interface CheckpointWriter {
  currentNode?: ExecutionNode;
  root: ExecutionNode;
  addNode: (node: Partial<ExecutionNode>) => Promise<string>;
  completeNode: (id: string, output: unknown) => Promise<void>;
  addMetadata: (id: string, metadata: Record<string, unknown>) => Promise<void>;
  write: () => Promise<void>;
}

export class CheckpointManager implements CheckpointWriter {
  private nodes = new Map<string, ExecutionNode>();
  public root: ExecutionNode;
  public currentNode?: ExecutionNode;

  constructor(private checkpointPath = "./execution.json") {
    this.root = {
      id: "root",
      componentName: "Root",
      startTime: Date.now(),
      children: [],
      props: {},
    };
    this.nodes.set("root", this.root);
    this.currentNode = this.root;
  }

  private async updateCheckpoint() {
    try {
      await writeFileSafe(
        this.checkpointPath,
        JSON.stringify(this.root, null, 2),
      );
    } catch (error) {
      console.error(`[Tracker] Failed to write checkpoint:`, { error });
    }
  }

  async addNode(partial: Partial<ExecutionNode>): Promise<string> {
    const parentId = this.currentNode?.id ?? "root";
    const node: ExecutionNode = {
      id: await generateUUID(),
      componentName: "Unknown",
      startTime: Date.now(),
      children: [],
      props: {},
      parentId,
      ...partial,
    };

    this.nodes.set(node.id, node);
    const parent = this.nodes.get(parentId);
    if (parent) {
      parent.children.push(node);
    }
    this.currentNode = node;

    await this.updateCheckpoint();
    return node.id;
  }

  async completeNode(id: string, output: unknown) {
    const node = this.nodes.get(id);
    if (node) {
      node.endTime = Date.now();
      node.output = output;

      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);

        this.currentNode = parent;
      } else {
        this.currentNode = undefined;
      }

      await this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to complete unknown node:`, { id });
    }
  }

  async addMetadata(id: string, metadata: Record<string, unknown>) {
    const node = this.nodes.get(id);
    if (node) {
      node.metadata = { ...node.metadata, ...metadata };
      await this.updateCheckpoint();
    }
  }

  async write() {
    await this.updateCheckpoint();
  }
}
