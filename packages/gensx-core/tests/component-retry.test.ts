import { expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { executeWorkflowWithCheckpoints } from "./utils/executeWithCheckpoints.js";

suite("component retry", () => {
  test("retries until success with exponential backoff config", async () => {
    let calls = 0;
    async function sometimesFails(): Promise<string> {
      calls++;
      if (calls < 3) throw new Error("flaky");
      return "ok";
    }

    const Comp = gensx.Component("RetryComp", sometimesFails, {
      retry: {
        enabled: true,
        maxAttempts: 5,
        strategy: {
          type: "exponential",
          initialDelayMs: 1,
          factor: 1.1,
          jitter: false,
          maxDelayMs: 2,
        },
      },
    });

    const { result, checkpoints } = await executeWorkflowWithCheckpoints(
      () => Comp({}),
      {},
    );

    expect(result).toBe("ok");
    // Find the RetryComp node
    const node = Object.values(checkpoints).find(
      (n) => n.componentName === "RetryComp",
    );
    expect(node).toBeDefined();
    expect(calls).toBe(3);
    expect(node?.metadata?.retry).toBeDefined();
    const retryMeta = node?.metadata?.retry as any;
    expect(retryMeta.enabled).toBe(true);
    expect(retryMeta.maxAttempts).toBe(5);
    expect(Array.isArray(retryMeta.attempts)).toBe(true);
    expect(retryMeta.attempts.length).toBeGreaterThanOrEqual(2);
  });

  test("respects retryOn predicate", async () => {
    let calls = 0;
    class NonRetryableError extends Error {}

    async function sometimesFails(): Promise<string> {
      calls++;
      if (calls === 1) throw new NonRetryableError("no-retry");
      return "ok";
    }

    const Comp = gensx.Component("RetryOnComp", sometimesFails, {
      retry: {
        enabled: true,
        maxAttempts: 3,
        strategy: { type: "fixed", delayMs: 1, jitter: false },
        retryOn: (err) => !(err instanceof NonRetryableError),
      },
    });

    const { result, checkpoints } = await executeWorkflowWithCheckpoints(
      () => Comp({}),
      {},
    );

    // Should NOT retry on first error, so component should fail; but since workflow catches errors, result undefined and error present
    const node = Object.values(checkpoints).find(
      (n) => n.componentName === "RetryOnComp",
    );
    expect(node).toBeDefined();
    // The node should be completed with an error metadata
    expect(node?.metadata?.error).toBeDefined();
    expect(result).toBeUndefined();
    expect(calls).toBe(1);
  });

  test("runtime retry config overrides and succeeds", async () => {
    let calls = 0;
    async function flaky(): Promise<string> {
      calls++;
      if (calls < 2) throw new Error("fail once");
      return "ok";
    }

    const Comp = gensx.Component("RuntimeRetryComp", flaky);

    const { result, checkpoints } = await executeWorkflowWithCheckpoints(
      () =>
        Comp(
          {},
          {
            retry: {
              enabled: true,
              maxAttempts: 2,
              strategy: { type: "fixed", delayMs: 1, jitter: false },
            },
          },
        ),
      {},
    );

    expect(result).toBe("ok");
    const node = Object.values(checkpoints).find(
      (n) => n.componentName === "RuntimeRetryComp",
    );
    expect(node?.metadata?.retry).toBeDefined();
    expect(calls).toBe(2);
  });
});
