import { join } from "node:path";

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
  root?: ExecutionNode;
  addNode: (node: Partial<ExecutionNode>, parentId?: string) => Promise<string>;
  completeNode: (id: string, output: unknown) => void;
  addMetadata: (id: string, metadata: Record<string, unknown>) => void;
  updateNode: (id: string, updates: Partial<ExecutionNode>) => void;
  write: () => void;
  waitForPendingUpdates: () => Promise<void>;
  checkpointsEnabled: boolean;
}

export class CheckpointManager implements CheckpointWriter {
  private nodes = new Map<string, ExecutionNode>();
  public root?: ExecutionNode;
  public checkpointsEnabled: boolean;

  // Track active checkpoint write
  private activeCheckpoint: Promise<void> | null = null;
  private pendingUpdate = false;

  constructor() {
    // Set checkpointsEnabled based on environment variable
    // Environment variables are strings, so check for common truthy values
    const checkpointsEnv = process.env.GENSX_CHECKPOINTS?.toLowerCase();
    this.checkpointsEnabled =
      checkpointsEnv === "true" ||
      checkpointsEnv === "1" ||
      checkpointsEnv === "yes";
  }

  // updateCheckpoint POSTs the current component tree to the GenSX API.
  // Special care is taken to do this in a non-blocking manner, and in a way that
  // minimizes chattiness with the server.
  // We only write one checkpoint at a time. If another checkpoint comes in while
  // we're still processing, we just mark that we need another update and return.
  // When the current checkpoint write is complete, we check if there was a pending
  // update request, and if so, we trigger another write.
  private updateCheckpoint() {
    if (!this.checkpointsEnabled || !this.root) {
      return;
    }

    // If there's already a pending update, just mark that we need another update
    if (this.activeCheckpoint) {
      this.pendingUpdate = true;
      return;
    }

    // Start a new checkpoint write
    this.activeCheckpoint = this.writeCheckpoint().finally(() => {
      this.activeCheckpoint = null;

      // If there was a pending update requested while we were writing,
      // trigger another write
      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        this.updateCheckpoint();
      }
    });
  }

  private async writeCheckpoint() {
    if (!this.root) return;

    try {
      const baseUrl =
        process.env.GENSX_CHECKPOINT_URL ?? "http://localhost:3000";
      const url = join(baseUrl, "api/execution");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.root),
      });

      if (!response.ok) {
        console.error(`[Checkpoint] Failed to save checkpoint, server error:`, {
          status: response.status,
          message: await response.text(),
        });
      }
    } catch (error) {
      console.error(`[Checkpoint] Failed to save checkpoint:`, { error });
    }
  }

  async addNode(partialNode: Partial<ExecutionNode>, parentId?: string) {
    const node: ExecutionNode = {
      id: await generateUUID(),
      componentName: "Unknown",
      startTime: Date.now(),
      children: [],
      props: {},
      ...partialNode,
    };

    this.nodes.set(node.id, node);

    if (parentId) {
      const parent = this.nodes.get(parentId);
      if (parent) {
        node.parentId = parentId;
        parent.children.push(node);
      }
    } else if (!this.root) {
      this.root = node;
    }

    this.updateCheckpoint();
    return node.id;
  }

  completeNode(id: string, output: unknown) {
    const node = this.nodes.get(id);
    if (node) {
      node.endTime = Date.now();
      node.output = output;
      this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to complete unknown node:`, { id });
    }
  }

  addMetadata(id: string, metadata: Record<string, unknown>) {
    const node = this.nodes.get(id);
    if (node) {
      node.metadata = { ...node.metadata, ...metadata };
      this.updateCheckpoint();
    }
  }

  updateNode(id: string, updates: Partial<ExecutionNode>) {
    const node = this.nodes.get(id);
    if (node) {
      Object.assign(node, updates);
      this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to update unknown node:`, { id });
    }
  }

  write() {
    this.updateCheckpoint();
  }

  async waitForPendingUpdates(): Promise<void> {
    // If there's an active checkpoint, wait for it
    if (this.activeCheckpoint) {
      await this.activeCheckpoint;
    }
    // If that checkpoint triggered another update, wait again
    if (this.pendingUpdate || this.activeCheckpoint) {
      await this.waitForPendingUpdates();
    }
  }
}
