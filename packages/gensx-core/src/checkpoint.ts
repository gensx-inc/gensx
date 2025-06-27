import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzip } from "node:zlib";

import {
  CheckpointWriter,
  ExecutionNode,
  STREAMING_PLACEHOLDER,
} from "./checkpoint-types.js";
import { readConfig } from "./utils/config.js";
import { USER_AGENT } from "./utils/user-agent.js";

export type { CheckpointWriter, ExecutionNode };
export { STREAMING_PLACEHOLDER };

const gzipAsync = promisify(gzip);

// Deterministic ID generation for checkpoint replay
export function generateDeterministicId(
  name: string,
  props: Record<string, unknown>,
  parentId?: string,
): string {
  // Simple but effective serialization for MVP
  const propsStr = JSON.stringify(props, Object.keys(props).sort());
  const propsHash = createHash("sha256")
    .update(`${propsStr}:${parentId ?? "root"}`)
    .digest("hex")
    .slice(0, 16);

  const id = `${name}:${propsHash}`;
  return id;
}

export class CheckpointManager implements CheckpointWriter {
  private nodes = new Map<string, ExecutionNode>();
  private orphanedNodes = new Map<string, Set<ExecutionNode>>();
  private _secretValues = new Map<string, Set<unknown>>(); // Internal per-node secrets
  private currentNodeChain: string[] = []; // Track current execution context
  private readonly MIN_SECRET_LENGTH = 8;
  public root?: ExecutionNode;
  public checkpointsEnabled: boolean;
  public workflowName?: string;
  private activeCheckpoint: Promise<void> | null = null;
  private pendingUpdate = false;
  private version = 1;
  private org: string;
  private apiKey: string;
  private apiBaseUrl: string;
  private consoleBaseUrl: string;
  private printUrl = false;
  private runtime?: "cloud" | "sdk";
  private runtimeVersion?: string;
  private checkpointListener?: (root: ExecutionNode) => Promise<void>;

  private sequenceNumber = 0;

  get nextNodeSequenceNumber() {
    return this.sequenceNumber++;
  }

  get nodeSequenceNumber() {
    return this.sequenceNumber;
  }

  private traceId?: string;
  private executionRunId?: string;

  // Replay functionality
  private replayLookup = new Map<
    string,
    (ExecutionNode & { consumed: boolean })[]
  >();
  private sourceCheckpoint?: ExecutionNode;

  // Provide unified view of all secrets
  get secretValues(): Set<unknown> {
    const allSecrets = new Set<unknown>();
    for (const secrets of this._secretValues.values()) {
      for (const secret of secrets) {
        allSecrets.add(secret);
      }
    }
    return allSecrets;
  }

  // Public getter for testing purposes
  get nodesForTesting(): Map<string, ExecutionNode> {
    return this.nodes;
  }

  constructor(opts?: {
    apiKey: string;
    org: string;
    disabled?: boolean;
    apiBaseUrl?: string;
    consoleBaseUrl?: string;
    executionRunId?: string;
    runtime?: "cloud" | "sdk";
    runtimeVersion?: string;
  }) {
    // Priority order: constructor opts > env vars > config file
    const config = readConfig();
    const apiKey =
      opts?.apiKey ?? process.env.GENSX_API_KEY ?? config.api?.token;
    const org = opts?.org ?? process.env.GENSX_ORG ?? config.api?.org;
    const apiBaseUrl =
      opts?.apiBaseUrl ?? process.env.GENSX_API_BASE_URL ?? config.api?.baseUrl;
    const consoleBaseUrl =
      opts?.consoleBaseUrl ??
      process.env.GENSX_CONSOLE_URL ??
      config.console?.baseUrl;

    this.checkpointsEnabled = apiKey !== undefined;
    this.org = org ?? "";
    this.apiKey = apiKey ?? "";
    this.apiBaseUrl = apiBaseUrl ?? "https://api.gensx.com";
    this.consoleBaseUrl = consoleBaseUrl ?? "https://app.gensx.com";

    const runtime = opts?.runtime ?? process.env.GENSX_RUNTIME;
    if (runtime && runtime !== "cloud" && runtime !== "sdk") {
      throw new Error('Invalid runtime. Must be either "cloud" or "sdk"');
    }
    this.runtime = runtime as "cloud" | "sdk" | undefined;
    this.runtimeVersion =
      opts?.runtimeVersion ?? process.env.GENSX_RUNTIME_VERSION;

    this.executionRunId =
      opts?.executionRunId ?? process.env.GENSX_EXECUTION_RUN_ID;

    if (
      opts?.disabled ||
      process.env.GENSX_CHECKPOINTS === "false" ||
      process.env.GENSX_CHECKPOINTS === "0" ||
      process.env.GENSX_CHECKPOINTS === "no" ||
      process.env.GENSX_CHECKPOINTS === "off"
    ) {
      this.checkpointsEnabled = false;
    }

    if (this.checkpointsEnabled && !this.org) {
      throw new Error(
        "Organization not set. Set it via constructor options, GENSX_ORG environment variable, or in ~/.config/gensx/config. You can disable checkpoints by setting GENSX_CHECKPOINTS=false or unsetting GENSX_API_KEY.",
      );
    }
  }

  private attachToParent(node: ExecutionNode, parent: ExecutionNode) {
    node.parentId = parent.id;
    if (!parent.children.some((child) => child.id === node.id)) {
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

  private isNativeFunction(value: unknown): boolean {
    return (
      typeof value === "function" &&
      Function.prototype.toString.call(value).includes("[native code]")
    );
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

  private havePrintedUrl = false;
  private async writeCheckpoint() {
    if (!this.root) return;

    await this.checkpointListener?.(this.root);

    try {
      // Create a deep copy of the execution tree for masking
      const cloneWithoutFunctions = (obj: unknown): unknown => {
        if (this.isNativeFunction(obj) || typeof obj === "function") {
          return "[function]";
        }
        if (Array.isArray(obj)) {
          return obj.map(cloneWithoutFunctions);
        }
        if (obj && typeof obj === "object" && !ArrayBuffer.isView(obj)) {
          return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
              key,
              cloneWithoutFunctions(value),
            ]),
          );
        }
        return obj;
      };

      const treeCopy = cloneWithoutFunctions(this.root);
      const maskedRoot = this.maskExecutionTree(treeCopy as ExecutionNode);
      const steps = this.countSteps(this.root);

      // Separately gzip the rawExecution data
      const compressedExecution = await gzipAsync(
        Buffer.from(
          JSON.stringify({
            ...maskedRoot,
            updatedAt: Date.now(),
          }),
          "utf-8",
        ),
      );
      const base64CompressedExecution =
        Buffer.from(compressedExecution).toString("base64");

      const workflowName = this.workflowName ?? this.root.componentName;
      const payload = {
        executionId: this.root.id,
        version: this.version,
        schemaVersion: 2,
        workflowName,
        startedAt: this.root.startTime,
        completedAt: this.root.endTime,
        rawExecution: base64CompressedExecution,
        steps,
        runtime: this.runtime,
        runtimeVersion: this.runtimeVersion,
        executionRunId: this.executionRunId,
      };

      const compressedData = await gzipAsync(JSON.stringify(payload));

      let response: Response;
      if (!this.traceId) {
        // create the trace
        const url = join(this.apiBaseUrl, `/org/${this.org}/traces`);
        response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
            Authorization: `Bearer ${this.apiKey}`,
            "accept-encoding": "gzip",
            "User-Agent": USER_AGENT,
          },
          body: compressedData,
        });
      } else {
        const url = join(
          this.apiBaseUrl,
          `/org/${this.org}/traces/${this.traceId}`,
        );
        // otherwise update the trace
        response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
            Authorization: `Bearer ${this.apiKey}`,
            "accept-encoding": "gzip",
            "User-Agent": USER_AGENT,
          },
          body: compressedData,
        });
      }

      if (!response.ok) {
        console.error(`[Checkpoint] Failed to save checkpoint, server error:`, {
          status: response.status,
          message: await response.text(),
        });
        return;
      }

      const responseBody = (await response.json()) as {
        executionId: string;
        traceId: string;
        workflowName: string;
      };

      this.traceId = responseBody.traceId;

      if (this.printUrl && !this.havePrintedUrl) {
        const executionUrl = new URL(
          `/${this.org}/default/executions/${responseBody.executionId}?workflowName=${responseBody.workflowName}`,
          this.consoleBaseUrl,
        );
        this.havePrintedUrl = true;
        console.info(
          `\n\n\x1b[33m[GenSX] View execution at:\x1b[0m \x1b[1;34m${executionUrl.toString()}\x1b[0m\n\n`,
        );
      }
    } catch (error) {
      console.error(`[Checkpoint] Failed to save checkpoint:`, { error });
    } finally {
      // Always increment, just in case the write was received by the server. The version value does not need to be
      // perfectly monotonic, just simply the next value needs to be greater than the previous value.
      this.version++;
    }
  }

  private countSteps(node: ExecutionNode): number {
    return node.children.reduce(
      (acc, child) => acc + this.countSteps(child),
      1,
    );
  }

  private maskExecutionTree(node: ExecutionNode): ExecutionNode {
    // Mask props
    node.props = this.scrubSecrets(node.props, node.id) as Record<
      string,
      unknown
    >;

    // Mask output if present
    if (node.output !== undefined) {
      node.output = this.scrubSecrets(node.output, node.id, "output");
    }

    // Mask metadata if present
    if (node.metadata) {
      node.metadata = this.scrubSecrets(
        node.metadata,
        node.id,
        "metadata",
      ) as Record<string, unknown>;
    }

    // Recursively mask children
    node.children = node.children.map((child) => this.maskExecutionTree(child));

    return node;
  }

  private isEqual(a: unknown, b: unknown): boolean {
    // Handle primitives
    if (a === b) return true;

    // If either isn't an object, they're not equal
    if (!a || !b || typeof a !== "object" || typeof b !== "object") {
      return false;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      return (
        a.length === b.length &&
        a.every((item, index) => this.isEqual(item, b[index]))
      );
    }

    // Handle objects
    if (!Array.isArray(a) && !Array.isArray(b)) {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);
      return (
        aKeys.length === bKeys.length &&
        aKeys.every((key) =>
          this.isEqual(a[key as keyof typeof a], b[key as keyof typeof b]),
        )
      );
    }

    return false;
  }

  private withNode<T>(nodeId: string, fn: () => T): T {
    this.currentNodeChain.push(nodeId);
    try {
      return fn();
    } finally {
      this.currentNodeChain.pop();
    }
  }

  private getEffectiveSecrets(): Set<unknown> {
    const allSecrets = new Set<unknown>();
    // Collect secrets from current node and all ancestors
    for (const nodeId of this.currentNodeChain) {
      const nodeSecrets = this._secretValues.get(nodeId);
      if (nodeSecrets) {
        for (const secret of nodeSecrets) {
          allSecrets.add(secret);
        }
      }
    }
    return allSecrets;
  }

  private registerSecrets(
    props: Record<string, unknown>,
    paths: string[],
    nodeId: string,
  ) {
    this.withNode(nodeId, () => {
      // Initialize secrets set for this node
      let nodeSecrets = this._secretValues.get(nodeId);
      if (!nodeSecrets) {
        nodeSecrets = new Set();
        this._secretValues.set(nodeId, nodeSecrets);
      }

      // Use paths purely for collection
      for (const path of paths) {
        const value = this.getValueAtPath(props, path);
        if (value !== undefined) {
          this.collectSecretValues(value, nodeSecrets);
        }
      }
    });
  }

  private collectSecretValues(
    data: unknown,
    nodeSecrets: Set<unknown>,
    visited = new WeakSet(),
  ): void {
    // Skip if already visited to prevent cycles
    if (data && typeof data === "object") {
      if (visited.has(data)) {
        return;
      }
      visited.add(data);
    }

    // Handle primitive values
    if (typeof data === "string") {
      if (data.length >= this.MIN_SECRET_LENGTH) {
        nodeSecrets.add(data);
      }
      return;
    }

    // Skip other primitives
    if (!data || typeof data !== "object") {
      return;
    }

    // Handle arrays and objects (excluding ArrayBuffer views)
    if (Array.isArray(data) || !ArrayBuffer.isView(data)) {
      const values = Array.isArray(data) ? data : Object.values(data);
      values.forEach((value) => {
        this.collectSecretValues(value, nodeSecrets, visited);
      });
    }
  }

  private scrubSecrets(data: unknown, nodeId?: string, path = ""): unknown {
    return this.withNode(nodeId ?? "", () => {
      // Handle native functions
      if (this.isNativeFunction(data)) {
        return "[native function]";
      }

      // Handle functions
      if (typeof data === "function") {
        return "[function]";
      }

      // Handle primitive values
      if (typeof data === "string" || typeof data === "number") {
        const strValue = String(data);
        return this.scrubString(strValue);
      }

      // Skip other primitives
      if (!data || typeof data !== "object") {
        return data;
      }

      // Handle arrays
      if (Array.isArray(data)) {
        return data.map((item, index) =>
          this.scrubSecrets(
            item,
            nodeId,
            path ? `${path}.${index}` : `${index}`,
          ),
        );
      }

      // Handle objects (excluding ArrayBuffer views)
      if (!ArrayBuffer.isView(data)) {
        return Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            this.scrubSecrets(value, nodeId, path ? `${path}.${key}` : key),
          ]),
        );
      }

      // Handle objects that shouldn't be cloned
      if (ArrayBuffer.isView(data)) return data;

      return data;
    });
  }

  private scrubString(value: string): string {
    const effectiveSecrets = this.getEffectiveSecrets();
    let result = value;

    // Sort secrets by length (longest first) to handle overlapping secrets correctly
    const secrets = Array.from(effectiveSecrets)
      .filter(
        (s) => typeof s === "string" && s.length >= this.MIN_SECRET_LENGTH,
      )
      .sort((a, b) => String(b).length - String(a).length);

    // Replace each secret with [secret]
    for (const secret of secrets) {
      if (typeof secret === "string") {
        // Only replace if the secret is actually in the string
        if (result.includes(secret)) {
          const escapedSecret = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(escapedSecret, "g");
          result = result.replace(regex, "[secret]");
        }
      }
    }

    return result;
  }

  private getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((curr: unknown, key: string) => {
      if (curr && typeof curr === "object") {
        return (curr as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private cloneValue(value: unknown): unknown {
    // Handle null/undefined
    if (value == null) return value;

    // Don't clone functions
    if (typeof value === "function") return value;

    // Handle primitive values
    if (typeof value !== "object") return value;

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map((item) => this.cloneValue(item));
    }

    // Handle objects that shouldn't be cloned
    if (ArrayBuffer.isView(value)) return value;

    // Check for toJSON method before doing regular object cloning
    const objValue = value as { toJSON?: () => unknown };
    if (typeof objValue.toJSON === "function") {
      return this.cloneValue(objValue.toJSON());
    }

    // For regular objects, clone each property
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, this.cloneValue(val)]),
    );
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
  addNode(
    partialNode: Partial<ExecutionNode> & {
      id: string;
      sequenceNumber: number;
    },
    parentId?: string,
  ): string {
    const nodeId = partialNode.id;
    if (!nodeId) {
      throw new Error("Node ID is required");
    }
    const clonedPartial = this.cloneValue(
      partialNode,
    ) as Partial<ExecutionNode> & { sequenceNumber: number; id: string };
    const node: ExecutionNode = {
      componentName: "Unknown",
      startTime: Date.now(),
      children: [],
      props: {},
      ...clonedPartial, // Clone mutable state while preserving functions
    };

    // Register any secrets from componentOpts
    if (node.componentOpts?.secretProps) {
      this.registerSecrets(node.props, node.componentOpts.secretProps, nodeId);
    }

    // Store raw values - masking happens at write time
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
      node.output = this.cloneValue(output);

      if (
        node.componentOpts?.secretOutputs &&
        output !== STREAMING_PLACEHOLDER
      ) {
        this.withNode(id, () => {
          let nodeSecrets = this._secretValues.get(id);
          if (!nodeSecrets) {
            nodeSecrets = new Set();
            this._secretValues.set(id, nodeSecrets);
          }
          this.collectSecretValues(output, nodeSecrets);
        });
      }

      this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to complete unknown node:`, { id });
    }
  }

  addMetadata(id: string, metadata: Record<string, unknown>) {
    const node = this.nodes.get(id);
    if (node) {
      node.metadata = {
        ...node.metadata,
        ...metadata,
      };
      this.updateCheckpoint();
    }
  }

  // TODO: What if we have already sent some checkpoints?
  setWorkflowName(name: string) {
    this.workflowName = name;
  }

  setPrintUrl(printUrl: boolean) {
    this.printUrl = printUrl;
  }

  getSequenceNumber(nodeId: string): number {
    const node = this.nodes.get(nodeId);
    if (node) {
      return node.sequenceNumber;
    }
    throw new Error(`Node ${nodeId} not found`);
  }

  updateNode(id: string, updates: Partial<ExecutionNode>) {
    const node = this.nodes.get(id);
    if (node) {
      if (
        "output" in updates &&
        node.componentOpts?.secretOutputs &&
        updates.output !== STREAMING_PLACEHOLDER
      ) {
        this.withNode(id, () => {
          let nodeSecrets = this._secretValues.get(id);
          if (!nodeSecrets) {
            nodeSecrets = new Set();
            this._secretValues.set(id, nodeSecrets);
          }
          this.collectSecretValues(updates.output, nodeSecrets);
        });
      }

      Object.assign(node, this.cloneValue(updates));
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

  // Replay functionality
  setReplayCheckpoint(checkpoint: ExecutionNode) {
    this.sourceCheckpoint = checkpoint;
    this.buildReplayLookup(checkpoint);
  }

  /**
   * Advances the sequence number to the specified value.
   * This is used during replay to ensure the sequence number matches the original execution.
   */
  private advanceSequenceNumberTo(targetSequence: number) {
    if (this.sequenceNumber < targetSequence) {
      this.sequenceNumber = targetSequence;
    }
  }

  private buildReplayLookup(node: ExecutionNode) {
    if (node.endTime && node.output !== undefined) {
      if (!this.replayLookup.has(node.id)) {
        this.replayLookup.set(node.id, []);
      }
      this.replayLookup.get(node.id)!.push({ ...node, consumed: false });
    }
    node.children.forEach((child) => {
      this.buildReplayLookup(child);
    });
  }

  getCompletedResult(nodeId: string, sequenceNumber: number): unknown {
    const result = this.replayLookup.get(nodeId);
    if (!result) {
      return undefined;
    }

    // first try to find the node with the correct sequence number
    const node = result.find(
      (node) => node.sequenceNumber === sequenceNumber && !node.consumed,
    );
    if (node) {
      node.consumed = true;
      return node.output;
    }

    // then try to find the first node that hasn't been consumed
    const firstNode = result.find((node) => !node.consumed);
    if (firstNode) {
      console.warn(
        `[Checkpoint] Found Node with id "${nodeId}" but it has sequence number ${firstNode.sequenceNumber} but we expected ${sequenceNumber}`,
      );
      firstNode.consumed = true;
      return firstNode.output;
    }

    return undefined;
  }

  // Checkpoint reconstruction methods
  addCachedSubtreeToCheckpoint(nodeId: string) {
    if (!this.sourceCheckpoint) {
      console.warn(
        `[Checkpoint] No source checkpoint available for node ${nodeId}`,
      );
      return;
    }

    const cachedNode = this.findNodeInCheckpoint(nodeId, this.sourceCheckpoint);
    if (cachedNode) {
      console.info(
        `[Checkpoint] Adding cached subtree for ${cachedNode.componentName} (${nodeId})`,
      );
      this.addCachedNodeRecursively(cachedNode);
    } else {
      console.warn(
        `[Checkpoint] Node ${nodeId} not found in source checkpoint`,
      );
    }
    this.updateCheckpoint();
  }

  private findNodeInCheckpoint(
    nodeId: string,
    checkpoint: ExecutionNode,
  ): ExecutionNode | null {
    if (checkpoint.id === nodeId) return checkpoint;

    for (const child of checkpoint.children) {
      const found = this.findNodeInCheckpoint(nodeId, child);
      if (found) return found;
    }

    return null;
  }

  private addCachedNodeRecursively(node: ExecutionNode) {
    // Check if this node already exists in the current checkpoint
    if (this.nodes.has(node.id)) {
      console.info(`[Checkpoint] Node ${node.id} already exists, skipping`);
      return;
    }

    // Create a copy of the node to avoid modifying the original
    const nodeCopy: ExecutionNode = {
      ...node,
      children: [], // We'll add children recursively
    };

    // During replay, advance the sequence number to match the original execution
    this.advanceSequenceNumberTo(nodeCopy.sequenceNumber + 1);

    // Add this node to the current checkpoint
    this.nodes.set(nodeCopy.id, nodeCopy);

    // Handle parent-child relationships
    if (nodeCopy.parentId) {
      const parent = this.nodes.get(nodeCopy.parentId);
      if (parent) {
        this.attachToParent(nodeCopy, parent);
      } else {
        // Parent doesn't exist yet - track as orphaned
        this.handleOrphanedNode(nodeCopy, nodeCopy.parentId);
      }
    } else {
      // This is a root node
      this.root ??= nodeCopy;
    }

    // Check if this node resolves any orphaned children
    const waitingChildren = this.orphanedNodes.get(nodeCopy.id);
    if (waitingChildren) {
      for (const orphan of waitingChildren) {
        this.attachToParent(orphan, nodeCopy);
      }
      this.orphanedNodes.delete(nodeCopy.id);
    }

    // Recursively add all children
    node.children.forEach((child) => {
      this.addCachedNodeRecursively(child);
    });
  }
}
