import { setTimeout } from "timers/promises";

import { expect, suite, test } from "vitest";

import { gsx } from "@/index.js";
import { JSX } from "@/jsx-runtime.js";

import { executeWithCheckpoints } from "./utils/executeWithCheckpoints";

suite("component", () => {
  test("can create anonymous component", async () => {
    const AnonymousComponent = gsx.Component<{}, string>(
      "AnonymousComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gsx.execute(<AnonymousComponent />);
    expect(result).toBe("hello");
  });

  test("can create named component", async () => {
    const NamedComponent = gsx.Component<{}, string>(
      "NamedComponent",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const result = await gsx.execute(<NamedComponent />);
    expect(result).toBe("hello");
  });

  test("can override component name with componentOpts", async () => {
    const TestComponent = gsx.Component<{}, string>(
      "OriginalName",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <TestComponent componentOpts={{ name: "CustomName" }} />,
    );

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(result).toBe("hello");
    expect(finalCheckpoint.componentName).toBe("CustomName");
  });

  test("component name falls back to original when not provided in componentOpts", async () => {
    const TestComponent = gsx.Component<{}, string>(
      "OriginalName",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const { result, checkpoints } = await executeWithCheckpoints<string>(
      <TestComponent />,
    );

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(result).toBe("hello");
    expect(finalCheckpoint.componentName).toBe("OriginalName");
  });

  test("stream component supports name override with componentOpts", async () => {
    const TestStreamComponent = gsx.StreamComponent<{}>(
      "OriginalStreamName",
      async function* () {
        await setTimeout(0);
        yield "hello";
        yield " ";
        yield "world";
      },
    );

    const { result, checkpoints, checkpointManager } =
      await executeWithCheckpoints<AsyncGenerator<string>>(
        <TestStreamComponent
          componentOpts={{ name: "CustomStreamName" }}
          stream={true}
        />,
      );

    // Collect streaming results
    let streamedContent = "";
    for await (const token of result) {
      streamedContent += token;
    }

    // Wait for final checkpoint to be written
    await checkpointManager.waitForPendingUpdates();

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];

    expect(streamedContent).toBe("hello world");
    expect(finalCheckpoint.componentName).toBe("CustomStreamName");
  });

  test("nested components can each have custom names", async () => {
    const ParentComponent = gsx.Component<{ children: JSX.Element }, string>(
      "ParentOriginal",
      async ({ children }) => {
        await setTimeout(0);
        return children;
      },
    );

    const ChildComponent = gsx.Component<{}, string>(
      "ChildOriginal",
      async () => {
        await setTimeout(0);
        return "hello";
      },
    );

    const { result, checkpoints, checkpointManager } =
      await executeWithCheckpoints<string>(
        <ParentComponent componentOpts={{ name: "CustomParent" }}>
          <ChildComponent componentOpts={{ name: "CustomChild" }} />
        </ParentComponent>,
      );

    // Wait for all checkpoint updates to complete
    await checkpointManager.waitForPendingUpdates();

    expect(checkpoints).toBeDefined();
    const finalCheckpoint = checkpoints[checkpoints.length - 1];
    expect(finalCheckpoint).toBeDefined();
    const childCheckpoint = finalCheckpoint.children[0];

    expect(result).toBe("hello");
    expect(finalCheckpoint.componentName).toBe("CustomParent");
    expect(childCheckpoint.componentName).toBe("CustomChild");
  });
});
