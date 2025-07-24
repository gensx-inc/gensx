import { Component } from "./component.js";
import { getCurrentContext } from "./context.js";
import { InferZodType, toJsonSchema, ZodTypeAny } from "./zod.js";

function getCallbackUrl(nodeId: string) {
  return `${process.env.GENSX_API_BASE_URL}/org/${process.env.GENSX_ORG}/workflowExecutions/${process.env.GENSX_EXECUTION_ID}/fulfill/${nodeId}`;
}

export async function requestInput<T extends ZodTypeAny>(
  trigger: (callbackUrl: string) => Promise<void>,
  resultSchema: InferZodType<T>,
  {
    timeoutAt,
    timeoutMs,
  }:
    | {
        timeoutAt?: Date;
        timeoutMs?: never;
      }
    | {
        timeoutMs?: number;
        timeoutAt?: never;
      } = {},
): Promise<InferZodType<T> | { error: string; type: "timeout" | "error" }> {
  const resultJsonSchema = toJsonSchema(resultSchema);

  // TODO: We should do some locking here to prevent multiple simultaneous requestInput calls.
  const TriggerComponent = Component(
    "RequestInputTrigger",
    async ({ nodeId }: { nodeId: string }) => {
      await trigger(getCallbackUrl(nodeId));
    },
  );

  // This is a magical component that, upon resume, will have the expected output in the checkpoint, filled in by the cloud runtime when the /fulfill endpoint is called.
  // We define this inside the requestInput function so that it can reference the trigger function _without_ it being passed in as an argument.
  const RequestInputComponent = Component("RequestInput", async () => {
    const context = getCurrentContext();
    const workflowContext = context.getWorkflowContext();
    const currentNodeId = context.getCurrentNode()?.id;
    if (!currentNodeId) {
      throw new Error("No current node ID found");
    }
    await TriggerComponent({ nodeId: currentNodeId });

    // Ensure that the we have flushed all pending updates to the server.
    await workflowContext.checkpointManager.waitForPendingUpdates();

    if (timeoutMs !== undefined) {
      timeoutAt = new Date(Date.now() + timeoutMs);
    }

    // This is where the magic happens 🪄
    return await workflowContext.onRequestInput({
      type: "input-request",
      nodeId: currentNodeId,
      resultSchema: resultJsonSchema,
      timeoutAt: timeoutAt?.toISOString() ?? null,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return (await RequestInputComponent()) as
    | InferZodType<T>
    | { error: string; type: "timeout" | "error" };
}
