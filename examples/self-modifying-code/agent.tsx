import { gsx } from "gensx";

import { Lease } from "./lease.js";
import { AgentContext } from "./workspace.js";
import { Workspace } from "./workspace.js";

export interface AgentProps {
  workspace: Workspace;
  context: AgentContext;
  lease: Lease;
}

export interface AgentResult {
  success: boolean;
  workspace?: Workspace; // The current or new workspace if changes were made
  error?: string;
}

/**
 *
 * TODO:
 * - read context
 * - decide on goal state
 * - write goal state to filesystem
 * - push commit with goal state
 * - make code changes
 * - "validate" changes
 * - if changes failed, then write the history and push a commit
 * - if changes succeeded then commit all files and push.
 * - finally, return the workspace and allow the outer control loop to spawn a new agent using the modified workspace.
 *
 */

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace, context, lease }) => {
    console.log("SelfModifyingCodeAgent", workspace, context, lease);
    // TODO: Implement agent logic
    throw new Error("Not implemented");
  },
);
