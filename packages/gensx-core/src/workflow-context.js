import { CheckpointManager } from "./checkpoint.js";
import { getCurrentContext } from "./context.js";
// Static symbol for workflow context
export const WORKFLOW_CONTEXT_SYMBOL = Symbol.for("gensx.workflow");
// For tests and environments where we need to avoid circular dependencies
function createDefaultManager(options) {
    // This is a workaround for circular dependencies in tests
    try {
        return new CheckpointManager(options);
    }
    catch (_e) {
        // Provide a basic mock implementation
        console.warn("Failed to create CheckpointManager, using fallback mock");
        return {
            checkpointsEnabled: false,
            workflowName: undefined,
            root: undefined,
            setWorkflowName: (_name) => {
                /* no-op */
            },
            setPrintUrl: (_printUrl) => {
                /* no-op */
            },
            addNode: () => "mock-node-id",
            completeNode: () => {
                /* no-op */
            },
            addMetadata: () => {
                /* no-op */
            },
            updateNode: () => {
                /* no-op */
            },
            write: () => {
                /* no-op */
            },
            waitForPendingUpdates: async () => {
                /* no-op */
            },
        };
    }
}
export function createWorkflowContext() {
    // Get optional API key and org from environment
    const apiKey = process.env.GENSX_API_KEY;
    const org = process.env.GENSX_ORG;
    // Create the options object for CheckpointManager
    const options = {
        apiKey: apiKey ?? "",
        org: org ?? "",
        disabled: !(apiKey && org),
    };
    return {
        checkpointManager: createDefaultManager(options),
    };
}
export function getWorkflowContext() {
    const context = getCurrentContext();
    return context.getWorkflowContext();
}
