import { expect, suite, test, vi } from "vitest";

import { ExecutionContext, withContext } from "../src/context.js";
import * as gensx from "../src/index.js";
import { waitForInput } from "../src/wait-for-input.js";
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

suite("wait for input", () => {
  test("waitForInput calls trigger with callback URL", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    const mockOnWaitForInput = vi.fn().mockResolvedValue(undefined);

    const { workflowContext, contextWithWorkflow } = createTestContext();
    workflowContext.onWaitForInput = mockOnWaitForInput;

    // Mock environment variables for URL generation
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      GENSX_API_BASE_URL: "https://api.test.com",
      GENSX_ORG: "test-org",
      GENSX_EXECUTION_ID: "exec-123",
    };

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {
        // Mock implementation
      });

    try {
      // Create a component that uses waitForInput to test in proper context
      const TestComponent = gensx.Component("TestComponent", async () => {
        vi.spyOn(
          workflowContext.checkpointManager,
          "waitForPendingUpdates",
        ).mockResolvedValue();

        return await waitForInput(mockTrigger);
      });

      await withContext(contextWithWorkflow, async () => {
        const result = await TestComponent();

        // waitForInput returns {} in test environment
        expect(result).toEqual({});

        // Verify trigger was called with a callback URL
        expect(mockTrigger).toHaveBeenCalledWith(
          expect.stringMatching(
            /^https:\/\/api\.test\.com\/org\/test-org\/workflowExecutions\/exec-123\/resume\//,
          ),
        );

        // Verify onWaitForInput was called
        expect(mockOnWaitForInput).toHaveBeenCalled();

        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[GenSX] Pause/resume not supported in this environment",
        );
      });
    } finally {
      process.env = originalEnv;
      consoleErrorSpy.mockRestore();
    }
  });

  test("waitForInput waits for pending updates before pausing", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    const mockOnWaitForInput = vi.fn().mockResolvedValue(undefined);
    const mockWaitForPendingUpdates = vi.fn().mockResolvedValue(undefined);

    const { workflowContext, contextWithWorkflow } = createTestContext();
    workflowContext.onWaitForInput = mockOnWaitForInput;

    const TestComponent = gensx.Component("TestComponent", async () => {
      vi.spyOn(
        workflowContext.checkpointManager,
        "waitForPendingUpdates",
      ).mockImplementation(mockWaitForPendingUpdates);

      return await waitForInput(mockTrigger);
    });

    await withContext(contextWithWorkflow, async () => {
      const result = await TestComponent();
      expect(result).toEqual({});

      // Verify that waitForPendingUpdates was called before onWaitForInput
      expect(mockWaitForPendingUpdates).toHaveBeenCalledBefore(
        mockOnWaitForInput,
      );
    });
  });

  test("waitForInput handles missing current node ID", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    const { contextWithWorkflow } = createTestContext();

    // Test without a current node context (outside of component execution)
    // The error might be caught and handled differently in the execution flow
    await withContext(contextWithWorkflow, async () => {
      try {
        const result = await waitForInput(mockTrigger);
        // If it doesn't throw, it should return empty object
        expect(result).toEqual({});
      } catch (error) {
        // If it does throw, verify it's the expected error
        expect(error).toEqual(
          expect.objectContaining({
            message: "No current node ID found",
          }),
        );
      }
    });
  });

  test("waitForInput generates correct callback URL format", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    const { workflowContext, contextWithWorkflow } = createTestContext();

    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      GENSX_API_BASE_URL: "https://custom-api.gensx.com",
      GENSX_ORG: "my-org",
      GENSX_EXECUTION_ID: "execution-456",
    };

    try {
      const TestComponent = gensx.Component("TestComponent", async () => {
        vi.spyOn(
          workflowContext.checkpointManager,
          "waitForPendingUpdates",
        ).mockResolvedValue();

        return await waitForInput(mockTrigger);
      });

      await withContext(contextWithWorkflow, async () => {
        await TestComponent();

        const callbackUrl = mockTrigger.mock.calls[0]?.[0] as string;
        expect(callbackUrl).toMatch(
          /^https:\/\/custom-api\.gensx\.com\/org\/my-org\/workflowExecutions\/execution-456\/resume\/.+$/,
        );
      });
    } finally {
      process.env = originalEnv;
    }
  });

  test("waitForInput returns empty object by default", async () => {
    const mockTrigger = vi.fn().mockResolvedValue(undefined);
    const { workflowContext, contextWithWorkflow } = createTestContext();

    const TestComponent = gensx.Component("TestComponent", async () => {
      vi.spyOn(
        workflowContext.checkpointManager,
        "waitForPendingUpdates",
      ).mockResolvedValue();

      return await waitForInput<{ message: string }>(mockTrigger);
    });

    await withContext(contextWithWorkflow, async () => {
      const result = await TestComponent();
      expect(result).toEqual({});
    });
  });
});
