/* eslint-disable @typescript-eslint/require-await */
import { beforeEach, expect, suite, test } from "vitest";

import * as gensx from "../src/index.js";
import { clearAllStates } from "../src/state.js";
import { ProgressEvent, ProgressListener } from "../src/workflow-context.js";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ChatApp {
  messages: ChatMessage[];
  isThinking: boolean;
  currentUser: string;
  sessionId: string;
}

suite("state management", () => {
  beforeEach(() => {
    clearAllStates();
  });
  test("can create and update state with delta events", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const chatState = gensx.state<ChatApp>("chatState", {
        messages: [],
        isThinking: false,
        currentUser: "test-user",
        sessionId: "test-session",
      });

      // Add a message
      chatState.update((state) => {
        state.messages.push({
          id: "msg-1",
          role: "user",
          content: "Hello!",
          timestamp: "2024-01-01T00:00:00Z",
        });
        return state;
      });

      // Start thinking
      chatState.update((state) => {
        state.isThinking = true;
        return state;
      });

      // Add response and stop thinking
      chatState.update((state) => {
        state.messages.push({
          id: "msg-2",
          role: "assistant",
          content: "Hi there! How can I help you?",
          timestamp: "2024-01-01T00:00:05Z",
        });
        state.isThinking = false;
        return state;
      });

      return "done";
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, { progressListener });

    // Filter for state update events
    const stateEvents = events.filter((e) => e.type === "state-update");

    expect(stateEvents).toHaveLength(4); // Initial + 3 updates

    // Check initial state event
    expect(stateEvents[0]).toEqual({
      type: "state-update",
      stateName: "chatState",
      patch: [],
      fullState: {
        messages: [],
        isThinking: false,
        currentUser: "test-user",
        sessionId: "test-session",
      },
    });

    // Check that all other events have patches
    expect(stateEvents[1].patch).toHaveLength(1);
    expect(stateEvents[1].patch[0].op).toBe("replace");
    expect(stateEvents[1].fullState).toBeUndefined();

    expect(stateEvents[2].patch).toHaveLength(1);
    expect(stateEvents[3].patch).toHaveLength(1);
  });

  test("state updates work with multiple calls", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const counter = gensx.state<{ count: number }>("counter", { count: 0 });

      // Make sequential updates
      counter.update((state) => {
        state.count = 1;
        return state;
      });

      counter.update((state) => {
        state.count = 2;
        return state;
      });

      counter.update((state) => {
        state.count = 3;
        return state;
      });

      return counter.get();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });

    expect(result).toEqual({ count: 3 });

    const stateEvents = events.filter((e) => e.type === "state-update");
    expect(stateEvents).toHaveLength(4); // Initial + 3 updates
  });

  test("can use multiple named states", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const userState = gensx.state<{ name: string; email: string }>("user", {
        name: "John",
        email: "john@example.com",
      });

      const appState = gensx.state<{ theme: string; language: string }>("app", {
        theme: "dark",
        language: "en",
      });

      userState.update((state) => {
        state.name = "Jane";
        return state;
      });

      appState.update((state) => {
        state.theme = "light";
        return state;
      });

      return "done";
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    await TestWorkflow(undefined, { progressListener });

    const stateEvents = events.filter((e) => e.type === "state-update");

    // Should have 4 events: 2 initial + 2 updates
    expect(stateEvents).toHaveLength(4);

    const userEvents = stateEvents.filter((e) => e.stateName === "user");
    const appEvents = stateEvents.filter((e) => e.stateName === "app");

    expect(userEvents).toHaveLength(2); // Initial + 1 update
    expect(appEvents).toHaveLength(2); // Initial + 1 update
  });

  test("state persists across multiple component calls", async () => {
    const events: ProgressEvent[] = [];

    const StateComponent = gensx.Component("StateComponent", async () => {
      const sharedState = gensx.state<{ value: number }>("shared", {
        value: 0,
      });

      sharedState.update((state) => {
        state.value += 1;
        return state;
      });

      return sharedState.get().value;
    });

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const result1 = await StateComponent();
      const result2 = await StateComponent();
      const result3 = await StateComponent();

      return { result1, result2, result3 };
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });

    // Each component call should increment the shared state
    expect(result).toEqual({
      result1: 1,
      result2: 2,
      result3: 3,
    });

    const stateEvents = events.filter((e) => e.type === "state-update");

    // Should have 4 events: 1 initial + 3 updates
    expect(stateEvents).toHaveLength(4);
    expect(stateEvents[0].fullState).toEqual({ value: 0 });
  });

  test("can reset state to initial value", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const testState = gensx.state<{ items: string[] }>("test", {
        items: ["a"],
      });

      // Modify state
      testState.update((state) => {
        state.items.push("b", "c");
        return state;
      });

      // Reset to initial
      testState.reset();

      return testState.get();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });

    expect(result).toEqual({ items: ["a"] });

    const stateEvents = events.filter((e) => e.type === "state-update");

    expect(stateEvents).toHaveLength(3); // Initial + update + reset
  });

  test("can set state directly", async () => {
    const events: ProgressEvent[] = [];

    const TestWorkflow = gensx.Workflow("TestWorkflow", async () => {
      const testState = gensx.state<{ message: string }>("test", {
        message: "initial",
      });

      testState.set({ message: "direct set" });

      return testState.get();
    });

    const progressListener: ProgressListener = (event) => {
      events.push(event);
    };

    const result = await TestWorkflow(undefined, { progressListener });

    expect(result).toEqual({ message: "direct set" });

    const stateEvents = events.filter((e) => e.type === "state-update");

    expect(stateEvents).toHaveLength(2); // Initial + set
  });
});
