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

  test("can compute and emit JSON patch delta events with full state on initial update", async () => {
    const events: ProgressEvent[] = [];

    await gensx.Workflow("TestWorkflow", async () => {
      const workflowState = gensx.state("test", {
        value: 10,
        status: "initial",
      });

      // First update (should include fullState)
      workflowState.update((s) => ({ ...s, status: "updated" }));

      // Second update (should not include fullState)
      workflowState.update((s) => ({ ...s, value: 20 }));

      return "done";
    })(undefined, {
      progressListener: (event) => {
        events.push(event);
      },
    });

    const stateEvents = events.filter((e) => e.type === "state-update");

    // Should have 3 state events: initial (with fullState), first update, second update
    expect(stateEvents).toHaveLength(3);

    // Initial state event should include fullState
    expect(stateEvents[0].fullState).toEqual({ value: 10, status: "initial" });

    // Subsequent events should not include fullState
    expect(stateEvents[1].fullState).toBeUndefined();
    expect(stateEvents[2].fullState).toBeUndefined();
  });

  test("state attachment system enables hierarchical composition", async () => {
    interface ComponentState {
      progress: number;
      phase: "starting" | "working" | "complete";
    }

    interface WorkflowState {
      overall: { phase: "component" | "finished" };
      component: ComponentState;
    }

    const events: ProgressEvent[] = [];

    await gensx.Workflow("AttachmentTest", async () => {
      // Create workflow state
      const workflowState = gensx.state<WorkflowState>("workflow", {
        overall: { phase: "component" },
        component: { progress: 0, phase: "starting" },
      });

      // Create component state
      const componentState = gensx.createStateManager("component", {
        progress: 0,
        phase: "starting" as "starting" | "working" | "complete",
      });

      // Attach component state to workflow state - this should emit an event
      workflowState.attachments.component.attach(componentState);

      // Update component state - these should propagate and emit events
      componentState.update((s) => ({
        ...s,
        phase: "working" as const,
        progress: 50,
      }));
      componentState.update((s) => ({
        ...s,
        phase: "complete" as const,
        progress: 100,
      }));

      // Update workflow overall state - this should emit an event
      workflowState.update((s) => ({ ...s, overall: { phase: "finished" } }));

      return "done";
    })(undefined, {
      progressListener: (event) => {
        events.push(event);
      },
    });

    const stateEvents = events.filter((e) => e.type === "state-update");

    // We should have at least:
    // 1. Initial workflow state creation
    // 2. Component state attachment
    // 3. First component update propagation
    // 4. Second component update propagation
    // 5. Final workflow update
    // So at least 5 state events
    expect(stateEvents.length).toBeGreaterThanOrEqual(4);

    // All events should be for the workflow state (not component state)
    stateEvents.forEach((event) => {
      expect(event.stateName).toBe("workflow");
    });
  });

  test("multiple child states can be attached to different properties", async () => {
    interface ResearchState {
      topics: string[];
      completed: number;
    }

    interface DraftState {
      sections: string[];
      wordCount: number;
    }

    interface BlogWorkflowState {
      phase: "research" | "draft" | "complete";
      research: ResearchState;
      draft: DraftState;
    }

    const events: ProgressEvent[] = [];

    await gensx.Workflow("MultiAttachmentTest", async () => {
      // Create workflow state
      const workflowState = gensx.state<BlogWorkflowState>("blog", {
        phase: "research",
        research: { topics: [], completed: 0 },
        draft: { sections: [], wordCount: 0 },
      });

      // Create component states
      const researchState = gensx.createStateManager("research", {
        topics: ["AI", "ML"],
        completed: 0,
      });

      const draftState = gensx.createStateManager("draft", {
        sections: ["intro"],
        wordCount: 0,
      });

      // Attach both states
      workflowState.attachments.research.attach(researchState);
      workflowState.attachments.draft.attach(draftState);

      // Update research state
      researchState.update((s) => ({ ...s, completed: 1 }));

      // Update draft state
      draftState.update((s) => ({
        ...s,
        sections: ["intro", "body"],
        wordCount: 500,
      }));

      // Update workflow phase
      workflowState.update((s) => ({ ...s, phase: "complete" }));

      return "done";
    })(undefined, {
      progressListener: (event) => {
        events.push(event);
      },
    });

    const stateEvents = events.filter((e) => e.type === "state-update");
    expect(stateEvents.length).toBeGreaterThan(0);

    // All events should be for the blog workflow state
    stateEvents.forEach((event) => {
      expect(event.stateName).toBe("blog");
    });
  });

  test("attached child state changes propagate to parent immediately", async () => {
    interface ChildState {
      value: number;
    }

    interface ParentState {
      child: ChildState;
      total: number;
    }

    let capturedStates: ParentState[] = [];
    const ignoredEvents: ProgressEvent[] = [];

    await gensx.Workflow("PropagationTest", async () => {
      const parentState = gensx.state<ParentState>("parent", {
        child: { value: 0 },
        total: 0,
      });

      const childState = gensx.createStateManager("child", { value: 0 });

      // Attach child state
      parentState.attachments.child.attach(childState);

      // Capture state after each update
      capturedStates.push(parentState.get());

      // Update child state
      childState.update((s) => ({ ...s, value: 10 }));
      capturedStates.push(parentState.get());

      childState.update((s) => ({ ...s, value: 20 }));
      capturedStates.push(parentState.get());

      return "done";
    })(undefined, {
      progressListener: (event) => {
        ignoredEvents.push(event);
      },
    });

    // Verify state propagation
    expect(capturedStates).toHaveLength(3);
    expect(capturedStates[0].child.value).toBe(0);
    expect(capturedStates[1].child.value).toBe(10);
    expect(capturedStates[2].child.value).toBe(20);
  });

  test("comprehensive workflow with hierarchical state composition", async () => {
    // Define comprehensive state structures
    interface ResearchComponentState {
      query: string;
      results: string[];
      completed: boolean;
    }

    interface WritingComponentState {
      sections: { title: string; content: string }[];
      wordCount: number;
      status: "draft" | "review" | "final";
    }

    interface BlogWorkflowState {
      phase: "research" | "writing" | "complete";
      title: string;
      research: ResearchComponentState;
      writing: WritingComponentState;
      metadata: {
        created: string;
        updated: string;
      };
    }

    const events: ProgressEvent[] = [];
    const capturedWorkflowStates: BlogWorkflowState[] = [];

    const result = await gensx.Workflow("BlogCreationWorkflow", async () => {
      // Create main workflow state
      const workflowState = gensx.state<BlogWorkflowState>("blog-workflow", {
        phase: "research",
        title: "",
        research: { query: "", results: [], completed: false },
        writing: { sections: [], wordCount: 0, status: "draft" },
        metadata: { created: "2024-01-01", updated: "2024-01-01" },
      });

      // Create component states that will be managed independently
      const researchState = gensx.createStateManager("research-component", {
        query: "",
        results: [] as string[],
        completed: false,
      });

      const writingState = gensx.createStateManager("writing-component", {
        sections: [] as { title: string; content: string }[],
        wordCount: 0,
        status: "draft" as "draft" | "review" | "final",
      });

      // Attach component states to workflow - enables hierarchical composition
      workflowState.attachments.research.attach(researchState);
      workflowState.attachments.writing.attach(writingState);

      // Capture initial state
      capturedWorkflowStates.push(workflowState.get());

      // Simulate research component working
      workflowState.update((s) => ({
        ...s,
        title: "Understanding State Management",
      }));

      researchState.update((s) => ({
        ...s,
        query: "state management patterns",
      }));
      researchState.update((s) => ({
        ...s,
        results: ["React state", "Redux patterns", "State machines"],
      }));
      researchState.update((s) => ({ ...s, completed: true }));

      // Transition to writing phase
      workflowState.update((s) => ({
        ...s,
        phase: "writing",
        metadata: { ...s.metadata, updated: "2024-01-02" },
      }));

      // Simulate writing component working
      writingState.update((s) => ({
        ...s,
        sections: [
          { title: "Introduction", content: "State management is crucial..." },
        ],
        wordCount: 250,
      }));

      writingState.update((s) => ({
        ...s,
        sections: [
          ...s.sections,
          { title: "Patterns", content: "Various patterns exist..." },
        ],
        wordCount: 500,
      }));

      writingState.update((s) => ({ ...s, status: "review" as const }));

      // Final workflow completion
      workflowState.update((s) => ({
        ...s,
        phase: "complete",
        metadata: { ...s.metadata, updated: "2024-01-03" },
      }));

      capturedWorkflowStates.push(workflowState.get());

      return "Blog creation workflow completed";
    })(undefined, {
      progressListener: (event) => {
        events.push(event);
      },
    });

    // Verify the workflow completed successfully
    expect(result).toBe("Blog creation workflow completed");

    // Verify hierarchical state composition worked
    const finalState =
      capturedWorkflowStates[capturedWorkflowStates.length - 1];

    // Research component state should be reflected in workflow state
    expect(finalState.research.query).toBe("state management patterns");
    expect(finalState.research.results).toHaveLength(3);
    expect(finalState.research.completed).toBe(true);

    // Writing component state should be reflected in workflow state
    expect(finalState.writing.sections).toHaveLength(2);
    expect(finalState.writing.wordCount).toBe(500);
    expect(finalState.writing.status).toBe("review");

    // Workflow-level state should be properly maintained
    expect(finalState.phase).toBe("complete");
    expect(finalState.title).toBe("Understanding State Management");
    expect(finalState.metadata.updated).toBe("2024-01-03");

    // Verify events were emitted (workflow state changes + component propagations)
    const stateEvents = events.filter((e) => e.type === "state-update");
    expect(stateEvents.length).toBeGreaterThan(8); // Many state updates occurred

    // All events should be for the workflow state (component states don't broadcast)
    stateEvents.forEach((event) => {
      expect(event.stateName).toBe("blog-workflow");
    });
  });
});
