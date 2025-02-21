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
  modified: boolean; // Whether the agent made changes to the workspace
  error?: string;
}

/**
 * The agent receives a workspace and can:
 * - read context
 * - make code changes in the workspace
 * - validate changes
 * - commit and push changes
 * - record history
 *
 * The agent does NOT create new workspaces - that's handled by the outer control loop.
 */

export const SelfModifyingCodeAgent = gsx.Component<AgentProps, AgentResult>(
  "SelfModifyingCodeAgent",
  ({ workspace, context, lease }) => {
    console.log("SelfModifyingCodeAgent", workspace, context, lease);
    // TODO: Implement agent logic
    throw new Error("Not implemented");
  },
);
