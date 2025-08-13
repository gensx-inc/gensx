import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { hrtime } from "node:process";
import { promisify } from "node:util";
import { gzip } from "node:zlib";

import {
  CheckpointWriter,
  ContentId,
  ExecutionNode,
  NodeId,
  PathId,
  STREAMING_PLACEHOLDER,
} from "./checkpoint-types.js";
import { isAsyncIterable, isReadableStream } from "./component.js";
import { readConfig } from "./utils/config.js";
import { generateNodeId, stringifyProps } from "./utils/nodeId.js";
import { USER_AGENT } from "./utils/user-agent.js";

export type { CheckpointWriter, ExecutionNode, NodeId };
export { STREAMING_PLACEHOLDER };

const gzipAsync = promisify(gzip);

class NodeMap<T extends ExecutionNode> {
  // Primary lookup by full ID
  private idLookup = new Map<string, T>();

  // Secondary lookups for fuzzy matching
  private pathLookup = new Map<string, Set<string>>(); // pathId -> Set<primaryId>
  private contentLookup = new Map<string, Set<string>>(); // contentId -> Set<primaryId>
  private pathContentLookup = new Map<string, Set<string>>(); // pathId:contentId -> Set<primaryId>

  set(node: T) {
    this.idLookup.set(node.id, node);

    // Update secondary lookups
    const pathId = getPathId(node.id);
    if (pathId) {
      if (!this.pathLookup.has(pathId)) {
        this.pathLookup.set(pathId, new Set());
      }
      this.pathLookup.get(pathId)!.add(node.id);
    }

    const contentId = getContentId(node.id);
    if (contentId) {
      if (!this.contentLookup.has(contentId)) {
        this.contentLookup.set(contentId, new Set());
      }
      this.contentLookup.get(contentId)!.add(node.id);
    }

    const pathContentId = `${pathId}:${contentId}`;
    if (!this.pathContentLookup.has(pathContentId)) {
      this.pathContentLookup.set(pathContentId, new Set());
    }
    this.pathContentLookup.get(pathContentId)!.add(node.id);
  }

  get(primaryIdOrNode: string | T): T | undefined {
    if (typeof primaryIdOrNode === "string") {
      return this.idLookup.get(primaryIdOrNode);
    }

    const node = primaryIdOrNode;
    return this.idLookup.get(node.id);
  }

  has(primaryIdOrNode: string | T): boolean {
    if (typeof primaryIdOrNode === "string") {
      return this.idLookup.has(primaryIdOrNode);
    }
    return this.get(primaryIdOrNode) !== undefined;
  }

  getByPathAndContent(pathId: string, contentId: string): T[] {
    const primaryIds =
      this.pathContentLookup.get(`${pathId}:${contentId}`) ?? new Set();
    return Array.from(primaryIds)
      .map((id) => this.idLookup.get(id))
      .filter((node): node is T => node !== undefined);
  }

  getByPath(pathId: string): T[] {
    const primaryIds = this.pathLookup.get(pathId) ?? new Set();
    return Array.from(primaryIds)
      .map((id) => this.idLookup.get(id))
      .filter((node): node is T => node !== undefined);
  }

  getByContent(contentId: string): T[] {
    const primaryIds = this.contentLookup.get(contentId) ?? new Set();
    return Array.from(primaryIds)
      .map((id) => this.idLookup.get(id))
      .filter((node): node is T => node !== undefined);
  }

  entries() {
    return Array.from(this.idLookup.entries());
  }

  clear() {
    this.idLookup.clear();
    this.pathLookup.clear();
    this.contentLookup.clear();
    this.pathContentLookup.clear();
  }
}

export class CheckpointManager implements CheckpointWriter {
  private nodes = new NodeMap<ExecutionNode>();
  private orphanedNodes = new Map<string, Set<ExecutionNode>>();
  private _secretValues = new Map<string, Set<unknown>>(); // Internal per-node secrets
  private currentNodeChain: ExecutionNode[] = []; // Track current execution context
  private readonly MIN_SECRET_LENGTH = 8;
  public root?: ExecutionNode;
  public checkpointsEnabled: boolean;
  public workflowName?: string;
  public projectName?: string;
  public environmentName?: string;
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

  private traceId?: string;
  private executionRunId?: string;

  // Replay functionality with enhanced fuzzy matching
  private replayLookup: ExecutionNode[] = [];

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
    const legacyMap = new Map<string, ExecutionNode>();
    for (const [primaryId, node] of this.nodes.entries()) {
      legacyMap.set(primaryId, node);
    }
    return legacyMap;
  }

  private callCounters = new Map<string, number>();

  public getNextCallIndex(
    parentPath: string,
    componentName: string,
    props: Record<string, unknown>,
    idPropsKeys: string[] | undefined,
  ): number {
    const contentContext = {
      name: componentName,
      props: stringifyProps(props, idPropsKeys),
      parent: parentPath,
    };
    const contentStr = JSON.stringify(contentContext);
    const contentHash = createHash("sha256")
      .update(contentStr)
      .digest("hex")
      .slice(0, 8);
    const key = `${parentPath}-${componentName}:${contentHash}`;
    const current = this.callCounters.get(key) ?? 0;
    this.callCounters.set(key, current + 1);
    return current;
  }

  constructor(opts?: {
    apiKey?: string;
    org?: string;
    disabled?: boolean;
    apiBaseUrl?: string;
    consoleBaseUrl?: string;
    executionRunId?: string;
    runtime?: "cloud" | "sdk";
    runtimeVersion?: string;
    checkpoint?: ExecutionNode;
    projectName?: string;
    environmentName?: string;
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

    // TODO: Read this from the gensx.yaml if it exists
    this.projectName = opts?.projectName ?? process.env.GENSX_PROJECT;
    this.environmentName =
      opts?.environmentName ?? process.env.GENSX_ENVIRONMENT;

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

    if (opts?.checkpoint) {
      this.buildReplayLookup(opts.checkpoint);
    }
  }

  private attachToParent(
    nodeToUpdate: ExecutionNode,
    parentToUpdate: ExecutionNode,
  ) {
    const node = this.nodes.get(nodeToUpdate);
    if (!node) {
      throw new Error("Node not found");
    }
    const parent = this.nodes.get(parentToUpdate);
    if (!parent) {
      throw new Error("Parent node not found");
    }
    node.parentId = parent.id;
    if (!parent.children.some((child) => child.id === node.id)) {
      parent.children.push(node);
    }
  }

  private handleOrphanedNode(node: ExecutionNode, parent: ExecutionNode) {
    let orphans = this.orphanedNodes.get(parent.id);
    if (!orphans) {
      orphans = new Set();
      this.orphanedNodes.set(parent.id, orphans);
    }
    orphans.add(node);

    // Add diagnostic timeout to detect stuck orphans
    this.checkOrphanTimeout(node, parent);
  }

  private isNativeFunction(value: unknown): boolean {
    return (
      typeof value === "function" &&
      Function.prototype.toString.call(value).includes("[native code]")
    );
  }

  private checkOrphanTimeout(
    expectedNode: ExecutionNode,
    expectedParent: ExecutionNode,
  ) {
    setTimeout(() => {
      const orphans = this.orphanedNodes.get(expectedParent.id);
      const node = this.nodes.get(expectedNode);
      if (!node) {
        console.warn(
          `[Checkpoint] Node ${expectedNode.id} (${expectedNode.componentName}) no longer exists`,
        );
        return;
      }
      if (orphans?.has(node)) {
        console.warn(
          `[Checkpoint] Node ${node.id} (${node.componentName}) still waiting for parent ${expectedParent.id} after 5s`,
          {
            node,
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

      function replacer(key: string, value: unknown): unknown {
        if (typeof value === "function") {
          console.warn("[GenSX] Unserializable function found in checkpoint", {
            key,
          });
          return "[function]";
        }

        if (typeof value === "object" && value !== null) {
          if (isAsyncIterable(value)) {
            console.warn(
              "[GenSX] Unserializable async iterable found in checkpoint",
              {
                key,
              },
            );
            return "[async-iterator]";
          }
          if (isReadableStream(value)) {
            console.warn(
              "[GenSX] Unserializable readable stream found in checkpoint",
              {
                key,
              },
            );
            return "[readable-stream]";
          }
        }

        if (typeof value === "symbol") {
          return `[Symbol(${value.toString()})]`;
        }

        return value;
      }

      // Separately gzip the rawExecution data
      const compressedExecution = await gzipAsync(
        Buffer.from(
          JSON.stringify(
            {
              ...maskedRoot,
              updatedAt: Date.now(),
            },
            replacer,
          ),
          "utf-8",
        ),
      );
      const base64CompressedExecution =
        Buffer.from(compressedExecution).toString("base64");

      const workflowName = this.workflowName ?? this.root.componentName;
      const payload = {
        executionId: this.executionRunId,
        version: this.version,
        schemaVersion: 2,
        workflowName,
        projectName: this.projectName,
        environmentName: this.environmentName,
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
    node.props = this.scrubSecrets(node.props, node) as Record<string, unknown>;

    // Mask output if present
    if (node.output !== undefined) {
      node.output = this.scrubSecrets(node.output, node, "output");
    }

    // Mask metadata if present
    if (node.metadata) {
      node.metadata = this.scrubSecrets(
        node.metadata,
        node,
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

  private withNode<T>(node: ExecutionNode, fn: () => T): T {
    this.currentNodeChain.push(node);
    try {
      return fn();
    } finally {
      this.currentNodeChain.pop();
    }
  }

  private getEffectiveSecrets(): Set<unknown> {
    const allSecrets = new Set<unknown>();
    for (const node of this.currentNodeChain) {
      const nodeSecrets = this._secretValues.get(node.id);
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
    node: ExecutionNode,
  ) {
    this.withNode(node, () => {
      // Initialize secrets set for this node
      let nodeSecrets = this._secretValues.get(node.id);
      if (!nodeSecrets) {
        nodeSecrets = new Set();
        this._secretValues.set(node.id, nodeSecrets);
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

  private scrubSecrets(
    data: unknown,
    nodeToScrub: ExecutionNode,
    path = "",
  ): unknown {
    const node = this.nodes.get(nodeToScrub);
    if (!node) {
      throw new Error("Node not found");
    }
    return this.withNode(node, () => {
      // Handle native functions
      if (this.isNativeFunction(data)) {
        return "[native function]";
      }

      // Handle functions
      if (typeof data === "function") {
        return "[function]";
      }

      // Handle primitive values
      if (typeof data === "string") {
        return this.scrubString(data);
      }

      // Skip other primitives
      if (!data || typeof data !== "object") {
        return data;
      }

      // Handle arrays
      if (Array.isArray(data)) {
        return data.map((item, index) =>
          this.scrubSecrets(item, node, path ? `${path}.${index}` : `${index}`),
        );
      }

      // Handle objects (excluding ArrayBuffer views)
      if (!ArrayBuffer.isView(data)) {
        return Object.fromEntries(
          Object.entries(data).map(([key, value]) => [
            key,
            this.scrubSecrets(value, node, path ? `${path}.${key}` : key),
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
      id: NodeId;
    },
    parentNode?: ExecutionNode,
    { skipCheckpointUpdate }: { skipCheckpointUpdate?: boolean } = {},
  ): ExecutionNode {
    const clonedPartial = this.cloneValue(
      partialNode,
    ) as Partial<ExecutionNode> & { id: NodeId };
    const node: ExecutionNode = {
      completed: false,
      componentName: "Unknown",
      startTime: Date.now(),
      // This gives us nanosecond precision for the start time, but without a stable epoch.
      // This lets us relatively compare the start time between nodes, but not absolutely know when it started (use startTime for that)
      startedAt: hrtime.bigint().toString(),
      children: [],
      props: {},
      ...clonedPartial, // Clone mutable state while preserving functions
    };

    // Register any secrets from componentOpts
    if (node.componentOpts?.secretProps) {
      this.registerSecrets(node.props, node.componentOpts.secretProps, node);
    }

    // Store enhanced node
    this.nodes.set(node);

    const parent = parentNode ? this.nodes.get(parentNode) : undefined;
    if (!parent && parentNode) {
      console.warn("[Checkpoint] Parent node not stored", {
        parentNode: {
          id: parentNode.id,
        },
      });
      // Parent doesn't exist yet - track as orphaned
      node.parentId = parentNode.id;
      this.handleOrphanedNode(node, parentNode);
    }

    if (parent) {
      // Normal case - parent exists
      this.attachToParent(node, parent);
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

    if (!skipCheckpointUpdate) {
      this.updateCheckpoint();
    }
    return node;
  }

  private addCachedNodeRecursively(
    node: ExecutionNode,
    parentNode?: ExecutionNode,
  ) {
    const parentPath = parentNode?.id ? getPathId(parentNode.id) : "";
    const nodeId = generateNodeId(
      node.componentName,
      node.props,
      node.componentOpts?.idPropsKeys,
      parentPath,
      this.getNextCallIndex(
        parentPath,
        node.componentName,
        node.props,
        node.componentOpts?.idPropsKeys,
      ),
    );
    // Check if this node already exists in the current checkpoint
    if (this.nodes.has(nodeId)) {
      console.debug(`[Replay] Node ${nodeId} already exists, skipping subtree`);
      return;
    }

    // Create a copy of the node to avoid modifying the original
    const nodeCopy: ExecutionNode = {
      ...node,
      id: nodeId,
      startedAt: hrtime.bigint().toString(),
      children: [], // We'll add children recursively
    };

    // Add this node to the current checkpoint
    this.nodes.set(nodeCopy);

    const parent = parentNode ? this.nodes.get(parentNode) : undefined;
    if (parentNode && !parent) {
      console.warn("[Checkpoint] Parent node not stored", {
        parentNode: {
          id: parentNode.id,
        },
      });

      // Parent doesn't exist yet - track as orphaned
      this.handleOrphanedNode(nodeCopy, parentNode);
    }

    // Handle parent-child relationships
    if (parent) {
      this.attachToParent(nodeCopy, parent);
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
      if (child.completed) {
        this.addCachedNodeRecursively(child, nodeCopy);
      }
    });
  }

  completeNode(
    nodeToUpdate: ExecutionNode,
    output: unknown,
    { wrapInPromise }: { wrapInPromise?: boolean } = {},
  ) {
    const node = this.nodes.get(nodeToUpdate);

    if (node) {
      node.completed = true;
      node.endTime = Date.now();
      node.output = this.cloneValue(output);

      if (wrapInPromise) {
        node.output = {
          __gensxSerialized: true,
          type: "promise",

          value: node.output,
        };
      }

      if (
        node.componentOpts?.secretOutputs &&
        output !== STREAMING_PLACEHOLDER
      ) {
        this.withNode(node, () => {
          let nodeSecrets = this._secretValues.get(node.id);
          if (!nodeSecrets) {
            nodeSecrets = new Set();
            this._secretValues.set(node.id, nodeSecrets);
          }
          this.collectSecretValues(output, nodeSecrets);
        });
      }

      this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to complete unknown node:`, {
        id: nodeToUpdate.id,
      });
    }
  }

  addMetadata(nodeToUpdate: ExecutionNode, metadata: Record<string, unknown>) {
    const node = this.nodes.get(nodeToUpdate);
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

  updateNode(nodeToUpdate: ExecutionNode, updates: Partial<ExecutionNode>) {
    const node = this.nodes.get(nodeToUpdate);
    if (node) {
      if (
        "output" in updates &&
        node.componentOpts?.secretOutputs &&
        updates.output !== STREAMING_PLACEHOLDER
      ) {
        this.withNode(node, () => {
          let nodeSecrets = this._secretValues.get(node.id);
          if (!nodeSecrets) {
            nodeSecrets = new Set();
            this._secretValues.set(node.id, nodeSecrets);
          }
          this.collectSecretValues(updates.output, nodeSecrets);
        });
      }

      Object.assign(node, this.cloneValue(updates));
      this.updateCheckpoint();
    } else {
      console.warn(`[Tracker] Attempted to update unknown node:`, {
        id: nodeToUpdate.id,
      });
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

  private buildReplayLookup(node: ExecutionNode) {
    this.addToReplayLookup(node);

    // Ensure all the nodes are in order of when they started, so we can just pick the appropriate node off the front of the list
    this.replayLookup.sort((a, b) =>
      Number(BigInt(a.startedAt) - BigInt(b.startedAt)),
    );
  }

  private addToReplayLookup(node: ExecutionNode) {
    this.replayLookup.push(node);

    node.children.forEach((child) => {
      this.addToReplayLookup(child);
    });
  }

  /**
   * 1. Check the first node in the list. If it has the same path, content ID and call index use it.
   * 2. If something does not match, look through the list to find a potential match (and warn about non-deterministic behavior if there is a match):
   *   a. Look for the first node that has the same path, content ID and call index.
   *   b. Look for the first node that has the same path and content ID.
   *   c. Look for the first node that has the same content ID.
   *   d. Look for the first node that has the same component name.
   * 3. If no match is found, this component is probably not in the checkpoint. If there are nodes in the checkpoint, this indicates non-deterministic behavior.
   * @param nodeId
   * @returns
   */
  getNodeFromCheckpoint(
    nodeId: NodeId,
  ):
    | { found: false; node?: ExecutionNode }
    | { found: true; node: ExecutionNode } {
    if (!this.replayLookup.length) {
      return { found: false };
    }

    const [pathId, contentId] = nodeId.split(":");
    const componentName = pathId.split("-").pop();

    // Strategy 1: Exact Node ID Match
    const exactNode = this.replayLookup.find((node) => node.id === nodeId);
    if (exactNode) {
      if (this.replayLookup.indexOf(exactNode) !== 0) {
        console.debug(
          `[Replay] Non-deterministic behavior detected ${exactNode.id} is not the next node in the checkpoint (next: ${this.replayLookup[0].id})`,
        );
      }
      this.replayLookup.splice(this.replayLookup.indexOf(exactNode), 1);
      return { found: true, node: exactNode };
    }

    // Strategy 2: Path/Content matching (same path, same content, different call index)
    const pathContentNode = this.replayLookup.find((node) => {
      const [nodePathId, nodeContentId] = node.id.split(":");
      return nodePathId === pathId && nodeContentId === contentId;
    });
    if (pathContentNode) {
      console.debug(
        `[Replay] Non-deterministic behavior detected: Found node with same path and content but different call index (target: ${nodeId}, found: ${pathContentNode.id})`,
      );
      this.replayLookup.splice(this.replayLookup.indexOf(pathContentNode), 1);
      return { found: true, node: pathContentNode };
    }

    // Strategy 3: Content-based matching (same content/component name, different path)
    const contentNode = this.replayLookup.find((node) => {
      const nodeContentId = getContentId(node.id);
      return (
        node.componentName === componentName && nodeContentId === contentId
      );
    });
    if (contentNode) {
      console.debug(
        `[Replay] Non-deterministic behavior detected: Found node with same content but different path (target: ${nodeId}, found: ${contentNode.id})`,
      );
      this.replayLookup.splice(this.replayLookup.indexOf(contentNode), 1);
      return { found: true, node: contentNode };
    }

    console.debug(
      `[Replay] No match found for node ${nodeId}, but there are unused nodes in the checkpoint. This may indicate non-deterministic behavior.`,
      JSON.stringify(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        this.replayLookup.map((node) => this.slimCheckpoint(node)),
        null,
        2,
      ),
    );
    return { found: false };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public slimCheckpoint(checkpoint?: ExecutionNode): any {
    if (!checkpoint) return undefined;
    const slimmed = {
      id: checkpoint.id,
      completed: checkpoint.completed,
      startedAt: checkpoint.startedAt,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      children: checkpoint.children.map((child) => this.slimCheckpoint(child)),
    };
    return slimmed;
  }

  // Checkpoint reconstruction methods
  addCachedSubtreeToCheckpoint(node: ExecutionNode, parent?: ExecutionNode) {
    console.debug(
      `[Replay] Adding cached subtree for ${node.componentName} (${node.id})`,
    );

    if (!node.completed) {
      return;
    }

    this.addCachedNodeRecursively(node, parent);

    // Validate tree structure after adding cached nodes
    if (!this.isTreeValid()) {
      console.warn(
        `[Replay] Tree validation failed after adding cached subtree for ${node.componentName}`,
      );
    }
  }
}

const pathIdsMap = new Map<string, PathId>();
const contentIdsMap = new Map<string, ContentId>();

// Helpers for working with node IDs
// eg. "Workflow/Component:456:789" -> "Workflow/Component", "456", "789"
function getPathId(id: NodeId): PathId {
  const pathId = pathIdsMap.get(id) ?? id.split(":")[0];
  pathIdsMap.set(id, pathId);
  return pathId;
}

function getContentId(id: NodeId): ContentId {
  const contentId = contentIdsMap.get(id) ?? id.split(":")[1];
  contentIdsMap.set(id, contentId);
  return contentId;
}
