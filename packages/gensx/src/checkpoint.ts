import { join } from "node:path";

// Cross-platform UUID generation
function generateUUID(): string {
  try {
    const crypto = globalThis.crypto;
    return crypto.randomUUID();
  } catch {
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
  addNode: (node: Partial<ExecutionNode>, parentId?: string) => string;
  completeNode: (id: string, output: unknown) => void;
  addMetadata: (id: string, metadata: Record<string, unknown>) => void;
  updateNode: (id: string, updates: Partial<ExecutionNode>) => void;
  write: () => void;
  waitForPendingUpdates: () => Promise<void>;
  checkpointsEnabled: boolean;
}

export class CheckpointManager implements CheckpointWriter {
  private nodes = new Map<string, ExecutionNode>();
  private orphanedNodes = new Map<string, Set<ExecutionNode>>();
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

  private attachToParent(node: ExecutionNode, parent: ExecutionNode) {
    node.parentId = parent.id;
    if (!parent.children.some(child => child.id === node.id)) {
      parent.children.push(node);
    }
  }

  private handleOrphanedNode(node: ExecutionNode, expectedParentId: string) {
    let orphans = this.orphanedNodes.get(expectedParentId);
    if (!orphans) {
      orphans = new Set();
      this.orphanedNodes.set(expectedParentId, orphans);
    }
    orphans.add(node);

    // Add diagnostic timeout to detect stuck orphans
    this.checkOrphanTimeout(node.id, expectedParentId);
  }

  private checkOrphanTimeout(nodeId: string, expectedParentId: string) {
    setTimeout(() => {
      const orphans = this.orphanedNodes.get(expectedParentId);
      if (orphans?.has(this.nodes.get(nodeId)!)) {
        console.warn(
          `[Checkpoint] Node ${nodeId} (${this.nodes.get(nodeId)?.componentName}) still waiting for parent ${expectedParentId} after 5s`,
          {
            node: this.nodes.get(nodeId),
            existingNodes: Array.from(this.nodes.entries()).map(
              ([id, node]) => ({
                id,
                componentName: node.componentName,
                parentId: node.parentId,
              }),
            ),
          },
        );
      }
    }, 5000);
  }

  /**
   * Validates that the execution tree is in a complete state where:
   * 1. Root node exists
   * 2. No orphaned nodes are waiting for parents
   * 3. All parent-child relationships are properly connected
   */
  private isTreeValid(): boolean {
    // No root means tree isn't valid
    if (!this.root) return false;

    // If we have orphaned nodes, tree isn't complete
    if (this.orphanedNodes.size > 0) return false;

    // Verify all nodes in the tree have their parents
    const verifyNode = (node: ExecutionNode): boolean => {
      for (const child of node.children) {
        if (child.parentId !== node.id) return false;
        if (!verifyNode(child)) return false;
      }
      return true;
    };

    return verifyNode(this.root);
  }

  /**
   * Updates the checkpoint in a non-blocking manner while ensuring consistency.
   * Special care is taken to:
   * 1. Queue updates instead of writing immediately to minimize API calls
   * 2. Only write one checkpoint at a time to maintain order
   * 3. Track pending updates to ensure no state is lost
   * 4. Validate tree completeness before writing
   *
   * The flow is:
   * 1. If a write is in progress, mark pendingUpdate = true
   * 2. When write completes, check pendingUpdate and trigger another write if needed
   * 3. Only write if tree is valid (has root and no orphans)
   */
  private updateCheckpoint() {
    if (!this.checkpointsEnabled) {
      return;
    }

    // Only write if we have a valid tree
    if (!this.isTreeValid()) {
      this.pendingUpdate = true;
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

  /**
   * Due to the async nature of component execution, nodes can arrive in any order.
   * For example, in a tree like:
   *    BlogWriter
   *      └─ OpenAIProvider
   *         └─ Research
   *
   * The Research component might execute before OpenAIProvider due to:
   * - Parallel execution of components
   * - Different resolution times for promises
   * - Network delays in API calls
   *
   * To handle this, we:
   * 1. Track orphaned nodes (children with parentIds where parents aren't yet in the graph) because:
   *    - We need to maintain the true hierarchy regardless of arrival order
   *    - We can't write incomplete checkpoints that would show incorrect relationships
   *    - The tree structure is important for debugging and monitoring
   *
   * 2. Allow root replacement because:
   *    - The first node to arrive might not be the true root
   *    - We need to maintain correct component hierarchy for visualization
   *    - Checkpoint consumers expect a complete, properly ordered tree
   *
   * This approach ensures that even if components resolve out of order,
   * the final checkpoint will always show the correct logical structure
   * of the execution.
   */
  addNode(partialNode: Partial<ExecutionNode>, parentId?: string): string {
    const nodeId = generateUUID();
    const node: ExecutionNode = {
      id: nodeId,
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
        // Normal case - parent exists
        this.attachToParent(node, parent);
      } else {
        // Parent doesn't exist yet - track as orphaned
        node.parentId = parentId;
        this.handleOrphanedNode(node, parentId);
      }
    } else {
      // Handle root node case
      if (!this.root) {
        this.root = node;
      } else if (this.root.parentId === node.id) {
        // Current root was waiting for this node as parent
        this.attachToParent(this.root, node);
        this.root = node;
      } else {
        console.warn(
          `[Checkpoint] Multiple root nodes detected: existing=${this.root.componentName}, new=${node.componentName}`,
        );
      }
    }

    // Check if this node is a parent any orphans are waiting for
    const waitingChildren = this.orphanedNodes.get(node.id);
    if (waitingChildren) {
      // Attach all waiting children
      for (const orphan of waitingChildren) {
        this.attachToParent(orphan, node);
      }
      // Clear the orphans list for this parent
      this.orphanedNodes.delete(node.id);
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
