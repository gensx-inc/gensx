import { ComponentOpts } from "./types.js";

export const STREAMING_PLACEHOLDER = "[streaming in progress]";

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
  componentOpts?: ComponentOpts;
  sequenceNumber: number;
}

export interface CheckpointWriter {
  root?: ExecutionNode;
  addNode: (
    node: Partial<ExecutionNode> & { id: string; sequenceNumber: number },
    parentId?: string,
  ) => string;
  completeNode: (id: string, output: unknown) => void;
  addMetadata: (id: string, metadata: Record<string, unknown>) => void;
  updateNode: (id: string, updates: Partial<ExecutionNode>) => void;
  write: () => void;
  waitForPendingUpdates: () => Promise<void>;
  checkpointsEnabled: boolean;
}
