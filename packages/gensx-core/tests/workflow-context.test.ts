import { expect, suite, test, vi } from "vitest";
import z from "zod";

import { CheckpointManager, ExecutionNode } from "../src/checkpoint.js";
import { ExecutionContext, withContext } from "../src/context.js";
import {
  createWorkflowContext,
  getWorkflowContext,
  WORKFLOW_CONTEXT_SYMBOL,
} from "../src/workflow-context.js";

suite("workflow context", () => {
  test("createWorkflowContext creates context with default values", () => {
    const context = createWorkflowContext();

    expect(context.checkpointManager).toBeInstanceOf(CheckpointManager);
    expect(context.checkpointLabelMap).toBeInstanceOf(Map);
    expect(context.checkpointLabelMap.size).toBe(0);
    expect(typeof context.sendWorkflowMessage).toBe("function");
    expect(typeof context.onRequestInput).toBe("function");
    expect(typeof context.onRestoreCheckpoint).toBe("function");
  });

  test("createWorkflowContext uses provided callbacks", () => {
    const mockOnMessage = vi.fn();
    const mockOnRequestInput = vi.fn();
    const mockOnRestoreCheckpoint = vi.fn();

    const context = createWorkflowContext({
      onMessage: mockOnMessage,
      onRequestInput: mockOnRequestInput,
      onRestoreCheckpoint: mockOnRestoreCheckpoint,
    });

    // Test that the provided functions are used
    const testMessage = { type: "data" as const, data: "test-data" };
    context.sendWorkflowMessage(testMessage);
    expect(mockOnMessage).toHaveBeenCalledWith(testMessage);

    expect(context.onRequestInput).toBe(mockOnRequestInput);
    expect(context.onRestoreCheckpoint).toBe(mockOnRestoreCheckpoint);
  });

  test("createWorkflowContext uses default handlers when not provided", async () => {
    const context = createWorkflowContext();

    // Test default onRequestInput - should log warning
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
      // Mock implementation
    });
    await context.onRequestInput({
      type: "input-request",
      nodeId: "test-node-id",
      resultSchema: z.object({}),
      timeoutAt: null,
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "[GenSX] Requesting input not supported in this environment",
    );

    // Test default onRestoreCheckpoint - should log warning
    await context.onRestoreCheckpoint(
      { id: "test-node-id" } as unknown as ExecutionNode,
      { feedback: "test" },
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "[GenSX] Restore checkpoint not supported in this environment",
    );

    consoleSpy.mockRestore();
  });

  test("getWorkflowContext returns current context", () => {
    const workflowContext = createWorkflowContext();
    const executionContext = new ExecutionContext({});
    const contextWithWorkflow = executionContext.withContext({
      [WORKFLOW_CONTEXT_SYMBOL]: workflowContext,
    });

    withContext(contextWithWorkflow, () => {
      const retrievedContext = getWorkflowContext();
      expect(retrievedContext).toBe(workflowContext);
    });
  });

  test("getWorkflowContext returns default context when no specific context", () => {
    const retrievedContext = getWorkflowContext();
    expect(retrievedContext).toBeDefined();
    expect(retrievedContext?.checkpointManager).toBeInstanceOf(
      CheckpointManager,
    );
    expect(retrievedContext?.checkpointLabelMap).toBeInstanceOf(Map);
  });

  test("checkpointLabelMap tracks checkpoint labels", () => {
    const context = createWorkflowContext();

    // Initially empty
    expect(context.checkpointLabelMap.size).toBe(0);

    // Add some labels
    context.checkpointLabelMap.set("checkpoint1", {
      id: "node-id-1",
    } as unknown as ExecutionNode);
    context.checkpointLabelMap.set("checkpoint2", {
      id: "node-id-2",
    } as unknown as ExecutionNode);

    expect(context.checkpointLabelMap.size).toBe(2);
    expect(context.checkpointLabelMap.get("checkpoint1")?.id).toBe("node-id-1");
    expect(context.checkpointLabelMap.get("checkpoint2")?.id).toBe("node-id-2");
    expect(context.checkpointLabelMap.has("checkpoint3")).toBe(false);
  });

  test("sendWorkflowMessage handles undefined callback gracefully", () => {
    const context = createWorkflowContext(); // No onMessage provided

    // Should not throw
    expect(() => {
      context.sendWorkflowMessage({ type: "data", data: "test-data" });
    }).not.toThrow();
  });

  test("workflow context symbol is consistent", () => {
    expect(WORKFLOW_CONTEXT_SYMBOL).toBe(Symbol.for("gensx.workflow"));

    // Multiple calls should return same symbol
    const symbol1 = Symbol.for("gensx.workflow");
    const symbol2 = Symbol.for("gensx.workflow");
    expect(symbol1).toBe(symbol2);
    expect(symbol1).toBe(WORKFLOW_CONTEXT_SYMBOL);
  });

  test("workflow context maintains separate checkpoint managers", () => {
    const context1 = createWorkflowContext();
    const context2 = createWorkflowContext();

    expect(context1.checkpointManager).not.toBe(context2.checkpointManager);
    expect(context1.checkpointLabelMap).not.toBe(context2.checkpointLabelMap);
  });

  test("workflow context callbacks are independent", () => {
    const mock1 = vi.fn();
    const mock2 = vi.fn();

    const context1 = createWorkflowContext({ onMessage: mock1 });
    const context2 = createWorkflowContext({ onMessage: mock2 });

    context1.sendWorkflowMessage({ type: "data", data: "data1" });
    context2.sendWorkflowMessage({ type: "data", data: "data2" });

    expect(mock1).toHaveBeenCalledWith({ type: "data", data: "data1" });
    expect(mock2).toHaveBeenCalledWith({ type: "data", data: "data2" });
    expect(mock1).toHaveBeenCalledTimes(1);
    expect(mock2).toHaveBeenCalledTimes(1);
  });
});
