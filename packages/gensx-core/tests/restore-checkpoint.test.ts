import { expect, suite, test, vi } from "vitest";

import { ExecutionContext, withContext } from "../src/context.js";
import {
  createCheckpoint,
  restoreCheckpoint,
} from "../src/restore-checkpoint.js";
import {
  createWorkflowContext,
  WORKFLOW_CONTEXT_SYMBOL,
} from "../src/workflow-context.js";

function createTestContext() {
  const workflowContext = createWorkflowContext();
  const executionContext = new ExecutionContext({});
  const contextWithWorkflow = executionContext.withContext({
    [WORKFLOW_CONTEXT_SYMBOL]: workflowContext,
  });
  return { workflowContext, contextWithWorkflow };
}

suite("restore checkpoint", () => {
  test("createCheckpoint creates a checkpoint marker", () => {
    const { workflowContext, contextWithWorkflow } = createTestContext();

    withContext(contextWithWorkflow, () => {
      const checkpoint = createCheckpoint({ label: "test-checkpoint" });

      expect(checkpoint.label).toBe("test-checkpoint");
      expect(checkpoint.feedback).toBeNull();
      expect(typeof checkpoint.restore).toBe("function");
      expect(workflowContext.checkpointLabelMap.has("test-checkpoint")).toBe(
        true,
      );
    });
  });

  test("createCheckpoint generates label if not provided", () => {
    const { workflowContext, contextWithWorkflow } = createTestContext();

    withContext(contextWithWorkflow, () => {
      const checkpoint = createCheckpoint();

      expect(checkpoint.label).toMatch(/^checkpoint-marker-\d+$/);
      expect(workflowContext.checkpointLabelMap.has(checkpoint.label)).toBe(
        true,
      );
    });
  });

  test("createCheckpoint throws error for duplicate labels", () => {
    const { contextWithWorkflow } = createTestContext();

    withContext(contextWithWorkflow, () => {
      createCheckpoint({ label: "duplicate-label" });

      expect(() => {
        createCheckpoint({ label: "duplicate-label" });
      }).toThrow(
        "[GenSX] Checkpoint duplicate-label has already been created.",
      );
    });
  });

  test("restoreCheckpoint throws error for unknown checkpoint", async () => {
    const { contextWithWorkflow } = createTestContext();

    await withContext(contextWithWorkflow, async () => {
      await expect(
        restoreCheckpoint("unknown-checkpoint", { data: "test" }),
      ).rejects.toThrow(
        "[GenSX] Checkpoint unknown-checkpoint has not been created.",
      );
    });
  });

  test("restoreCheckpoint calls onRestoreCheckpoint callback", async () => {
    const mockOnRestoreCheckpoint = vi.fn().mockResolvedValue(undefined);
    const workflowContext = createWorkflowContext({
      onRestoreCheckpoint: mockOnRestoreCheckpoint,
    });
    const executionContext = new ExecutionContext({});
    const contextWithWorkflow = executionContext.withContext({
      [WORKFLOW_CONTEXT_SYMBOL]: workflowContext,
    });

    // Mock console.error to capture the expected log
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // Mock implementation
      });

    await withContext(contextWithWorkflow, async () => {
      // First create a checkpoint
      createCheckpoint({ label: "test-restore" });

      // Mock the waitForPendingUpdates method
      vi.spyOn(
        workflowContext.checkpointManager,
        "waitForPendingUpdates",
      ).mockResolvedValue();

      // Now restore it - should complete without throwing
      const feedback = { message: "test feedback" };
      await restoreCheckpoint("test-restore", feedback);

      // Verify the callback was called with correct parameters
      expect(mockOnRestoreCheckpoint).toHaveBeenCalledWith(
        workflowContext.checkpointLabelMap.get("test-restore"),
        feedback,
      );

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[GenSX] Restoring checkpoints is not supported in this environment.",
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test("checkpoint restore function calls onRestoreCheckpoint", async () => {
    const mockOnRestoreCheckpoint = vi.fn().mockResolvedValue(undefined);
    const workflowContext = createWorkflowContext({
      onRestoreCheckpoint: mockOnRestoreCheckpoint,
    });
    const executionContext = new ExecutionContext({});
    const contextWithWorkflow = executionContext.withContext({
      [WORKFLOW_CONTEXT_SYMBOL]: workflowContext,
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // Mock implementation
      });

    await withContext(contextWithWorkflow, async () => {
      const checkpoint = createCheckpoint({ label: "test-direct-restore" });

      // Mock the waitForPendingUpdates method
      vi.spyOn(
        workflowContext.checkpointManager,
        "waitForPendingUpdates",
      ).mockResolvedValue();

      const feedback = { value: 42 };
      await checkpoint.restore(feedback);

      expect(mockOnRestoreCheckpoint).toHaveBeenCalledWith(
        workflowContext.checkpointLabelMap.get("test-direct-restore"),
        feedback,
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[GenSX] Restoring checkpoints is not supported in this environment.",
      );
    });

    consoleErrorSpy.mockRestore();
  });

  test("createCheckpoint respects maxRestores option", () => {
    const { contextWithWorkflow } = createTestContext();

    withContext(contextWithWorkflow, () => {
      const checkpoint = createCheckpoint(
        { label: "limited-restore" },
        { maxRestores: 1 },
      );

      expect(checkpoint.label).toBe("limited-restore");
    });
  });
});
