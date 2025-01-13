import { writeFile } from "fs/promises";

// Cross-platform UUID generation
async function generateUUID(): Promise<string> {
  try {
    // Try Node.js crypto first
    const crypto = await import("node:crypto");
    return crypto.randomUUID();
  } catch {
    // Fallback to browser crypto
    if (typeof globalThis !== "undefined" && globalThis.crypto) {
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

export interface ExecutionTracker {
  currentNode?: ExecutionNode;
  root: ExecutionNode;
  addNode: (node: Partial<ExecutionNode>) => Promise<string>;
  completeNode: (id: string, output: unknown) => Promise<void>;
  addMetadata: (id: string, metadata: Record<string, unknown>) => Promise<void>;
  writeCheckpoint: () => Promise<void>;
}

export class DefaultExecutionTracker implements ExecutionTracker {
  private nodes: Map<string, ExecutionNode> = new Map();
  public root: ExecutionNode;
  public currentNode?: ExecutionNode;

  constructor(private checkpointPath: string = "./execution.json") {
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
    if (this.checkpointPath) {
      await writeFile(this.checkpointPath, JSON.stringify(this.root, null, 2));
    }
  }

  async addNode(partial: Partial<ExecutionNode>): Promise<string> {
    const parentId = this.currentNode?.id || "root";
    const node: ExecutionNode = {
      id: await generateUUID(),
      componentName: "Unknown",
      startTime: Date.now(),
      children: [],
      props: {},
      parentId,
      ...partial,
    };

    // Ensure children array exists and isn't overridden
    node.children = node.children || [];

    console.log(`Adding node: ${node.componentName} (${node.id})`);
    console.log(
      `  Parent: ${this.nodes.get(parentId)?.componentName} (${parentId})`,
    );

    this.nodes.set(node.id, node);
    const parent = this.nodes.get(parentId);
    if (parent) {
      parent.children.push(node);
      console.log(
        `  Added to parent's children. Parent now has ${parent.children.length} children`,
      );
    } else {
      console.warn(`  Parent node ${parentId} not found!`);
    }
    this.currentNode = node;

    await this.updateCheckpoint();
    return node.id;
  }

  async completeNode(id: string, output: unknown) {
    const node = this.nodes.get(id);
    if (node) {
      console.log(`Completing node: ${node.componentName} (${node.id})`);
      node.endTime = Date.now();
      node.output = output;

      if (node.parentId) {
        const parent = this.nodes.get(node.parentId);
        console.log(
          `  Returning to parent: ${parent?.componentName} (${node.parentId})`,
        );
        this.currentNode = parent;
      } else {
        console.log("  No parent, returning to root");
        this.currentNode = undefined;
      }

      await this.updateCheckpoint();
    } else {
      console.warn(`Attempted to complete unknown node: ${id}`);
    }
  }

  async addMetadata(id: string, metadata: Record<string, unknown>) {
    const node = this.nodes.get(id);
    if (node) {
      node.metadata = { ...node.metadata, ...metadata };
      await this.updateCheckpoint();
    }
  }

  async writeCheckpoint() {
    await this.updateCheckpoint();
  }
}
