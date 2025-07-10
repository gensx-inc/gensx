import { ComponentOpts } from "./types.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

export interface ExecutionNode {
  id: NodeId;
  componentName: string;
  parentId?: string;
  startTime: number;
  // This is a high precision measurement in nanoseconds, that is NOT based on the epoch. This is only useful as a relative measurement with other nodes in the same checkpoint (and not other checkpoints for the same execution)
  startedAt: string;
  endTime?: number;
  props: Record<string, unknown>;
  output?: unknown;
  completed: boolean;
  children: ExecutionNode[];
  metadata?: {
    logs?: string[];
    tokenCounts?: {
      input: number;
      output: number;
    };
    [key: string]: unknown;
  };
  componentOpts?: ComponentOpts;
}

export type NodeId = `${PathId}:${ContentId}:${CallIndex}`;
export type PathId = string;
export type ContentId = string;
export type CallIndex = number;

export interface CheckpointWriter {
  root?: ExecutionNode;
  addNode: (
    node: Partial<ExecutionNode> & { id: string },
    parent?: ExecutionNode,
  ) => ExecutionNode;
  completeNode: (
    node: ExecutionNode,
    output: unknown,
    opts?: { wrapInPromise?: boolean },
  ) => void;
  addMetadata: (node: ExecutionNode, metadata: Record<string, unknown>) => void;
  updateNode: (node: ExecutionNode, updates: Partial<ExecutionNode>) => void;
  write: () => void;
  waitForPendingUpdates: () => Promise<void>;
  checkpointsEnabled: boolean;
}
