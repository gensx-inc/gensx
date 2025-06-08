# GenSX Hierarchical State Composition Design

## Overview

This design introduces a **hierarchical state composition system** that solves the fundamental tension between component reusability and rich frontend state management. Components produce both output and composable state streams that can be explicitly attached to parent state structures.

## Core Problems Solved

1. **Component Reusability**: Components remain pure functions without being coupled to specific state shapes
2. **Type Safety**: Full TypeScript support for composed state structures
3. **Parallel Execution Tracking**: Rich visibility into concurrent operations
4. **Efficient State Streaming**: JSON patch-based delta updates only for attached state
5. **Explicit Composition**: Clear, predictable state attachment patterns
6. **Opt-in Complexity**: Simple components stay simple, stateful components are explicit

## API Design

### Simple Components (No State)

Most components remain simple and unchanged:

```typescript
const GenerateTopics = gensx.Component(
  "GenerateTopics",
  async (props: TopicProps) => {
    // Simple component - just returns output, no state
    const result = await generateObject({
      model: anthropic("claude-sonnet-4-20250514"),
      schema: z.object({ topics: z.array(z.string()) }),
      prompt: `Generate research topics for: ${props.title}`,
    });

    return result;
  },
);
```

### Stateful Components

Components that need to expose state use the explicit StatefulComponent API:

```typescript
interface ResearchState {
  topics: string[];
  completedTopics: string[];
  currentTopic?: string;
  phase: "generating" | "researching" | "complete";
}

const Research = gensx.StatefulComponent<ResearchState>(
  "Research",
  (props: ResearchProps) => {
    // Component manages its own state
    const researchState = gensx.state<ResearchState>("research", {
      topics: [],
      completedTopics: [],
      phase: "generating",
    });

    // Return immediately with promise and state
    const outputPromise = (async () => {
      researchState.update((s) => ({ ...s, phase: "generating" }));

      const topics = await GenerateTopics(props);
      researchState.update((s) => ({
        ...s,
        topics: topics.object.topics,
        phase: "researching",
      }));

      // Parallel execution with individual state tracking
      const webResearchPromises = topics.object.topics.map(async (topic) => {
        researchState.update((s) => ({ ...s, currentTopic: topic }));
        const result = await WebResearch({ topic });
        researchState.update((s) => ({
          ...s,
          completedTopics: [...s.completedTopics, topic],
        }));
        return result;
      });

      const webResearch = await Promise.all(webResearchPromises);
      researchState.update((s) => ({ ...s, phase: "complete" }));

      return { topics: topics.object.topics, webResearch };
    })();

    return {
      output: outputPromise,
      state: researchState,
    };
  },
);
```

### Workflow State Composition

Workflows define their complete state shape and explicitly attach component states:

```typescript
interface BlogWorkflowState {
  overall: {
    phase: "research" | "outline" | "draft" | "editorial" | "complete";
    startTime: string;
    progress: { current: number; total: number };
  };
  research: ResearchState;
  draft: DraftState;
  editorial: EditorialState;
}

const WriteBlog = gensx.Workflow("WriteBlog", async (props: WriteBlogProps) => {
  // Workflow defines complete state shape
  const workflowState = gensx.state<BlogWorkflowState>("blog", {
    overall: {
      phase: "research",
      startTime: new Date().toISOString(),
      progress: { current: 0, total: 4 },
    },
    research: null, // Will be populated by attachment
    draft: null,
    editorial: null,
  });

  // Execute component and attach its state
  const { output: researchPromise, state: researchState } = Research({
    title: props.title,
    prompt: props.prompt,
  });

  // Explicit state attachment
  workflowState.research.attach(researchState);

  const research = await researchPromise;

  // Continue with other components...
  const { output: draftPromise, state: draftState } = WriteDraft({
    title: props.title,
    outline: outline.object,
    research: research,
  });

  workflowState.draft.attach(draftState);
  const draft = await draftPromise;

  return { title: props.title, content: draft.output };
});
```

### Component-to-Component Composition

Components can also attach child component states to their own state:

```typescript
interface DraftState {
  sections: Array<{
    heading: string;
    status: "pending" | "writing" | "complete";
    state: SectionState;  // Nested component state
  }>;
  phase: "initializing" | "writing" | "complete";
}

const WriteDraft = gensx.Component("WriteDraft", async (props: DraftProps) => {
  const draftState = gensx.state<DraftState>("draft", {
    sections: props.outline.sections.map(section => ({
      heading: section.heading,
      status: "pending",
      state: null
    })),
    phase: "writing"
  });

  // Write sections in parallel
  const sectionPromises = props.outline.sections.map(async (section, index) => {
    const { output, state } = WriteSection({ section, ... });

    // Attach section state to draft state
    draftState.sections[index].state.attach(state);

    return await output;
  });

  const sections = await Promise.all(sectionPromises);

  return {
    output: sections.join('\n'),
    state: draftState
  };
});
```

## State Manager API

```typescript
interface StateManager<T> {
  // Core state operations
  get(): T;
  update(updater: (state: T) => T): void;
  set(newState: T): void;
  reset(): void;

  // State attachment for composition
  [K in keyof T]: {
    attach(childState: StateManager<T[K]>): void;
  };
}

// Component APIs
type SimpleComponent<TProps, TOutput> = (
  props: TProps
) => Promise<TOutput>;

type StatefulComponent<TProps, TOutput, TState> = (
  props: TProps
) => {
  output: Promise<TOutput>;
  state: StateManager<TState>;
};

// Component constructors
function Component<TProps, TOutput>(
  name: string,
  fn: SimpleComponent<TProps, TOutput>
): SimpleComponent<TProps, TOutput>;

function StatefulComponent<TState>(name: string) {
  return function<TProps, TOutput>(
    fn: StatefulComponent<TProps, TOutput, TState>
  ): StatefulComponent<TProps, TOutput, TState>;
}
```

## Frontend Integration

Frontend code gets perfectly typed hierarchical state:

```typescript
import type { BlogWorkflowState } from './workflows/blog';

function useBlogState(workflowUrl: string) {
  const { state, isLoading } = useGensxState<BlogWorkflowState>(workflowUrl, 'blog');
  return { blogState: state, isLoading };
}

function BlogProgress() {
  const { blogState, isLoading } = useBlogState('/workflows/blog');

  if (isLoading || !blogState) return <div>Loading...</div>;

  return (
    <div>
      {/* Workflow-level state */}
      <div className="overall">
        <h2>Phase: {blogState.overall.phase}</h2>
        <ProgressBar
          current={blogState.overall.progress.current}
          total={blogState.overall.progress.total}
        />
      </div>

      {/* Research component state - fully typed */}
      <ResearchProgress
        topics={blogState.research.topics}
        completed={blogState.research.completedTopics}
        current={blogState.research.currentTopic}
        phase={blogState.research.phase}
      />

      {/* Draft component state - including nested sections */}
      <DraftProgress
        sections={blogState.draft.sections}
        phase={blogState.draft.phase}
      />
    </div>
  );
}
```

## Implementation Considerations

### State Attachment Mechanism

```typescript
// When attach() is called, create a state bridge
workflowState.research.attach(researchState);

// This creates a bidirectional binding:
// 1. researchState updates flow to workflowState.research
// 2. workflowState.research gets the current researchState value
// 3. JSON patches are computed and emitted for the composed state
```

### Opt-in State Streaming

State updates only emit progress events when attached to workflow state:

```typescript
// Component state updates do NOT automatically emit events
researchState.update(s => ({ ...s, phase: "complete" })); // No event emitted

// Only when attached to workflow state do updates flow to frontend
workflowState.research.attach(researchState); // Now updates emit events

// Subsequent updates generate progress events for the workflow state
{
  type: "state-update",
  stateName: "blog",  // Workflow state name (not component state name)
  patch: [
    { op: "replace", path: "/research/phase", value: "complete" },
    { op: "add", path: "/research/completedTopics/3", value: "AI Ethics" }
  ],
  fullState: undefined  // Only included for initial state
}
```

### State Scoping via Attachment

Component states are scoped through explicit attachment - no automatic namespacing needed:

```typescript
// Component creates local state: "research" (only local to component)
const researchState = gensx.state("research", initialState);

// Workflow attaches it to specific path: "blog.research"
workflowState.research.attach(researchState);

// Frontend receives: "blog" state with research data at the attached path
// The attachment point defines the scope, not the component state name
```

## Benefits

### ✅ **Component Reusability**

- Components only depend on their own state shape
- Same component can be used in different workflows
- No coupling to parent state structures

### ✅ **Perfect Type Safety**

- Workflow explicitly defines complete state shape
- TypeScript enforces correct attachment points
- Frontend gets full type checking

### ✅ **Explicit Composition**

- Clear, readable state attachment code
- No hidden magic or implicit behavior
- Easy to understand state flow

### ✅ **Efficient Streaming**

- JSON patch-based delta updates
- Automatic state synchronization
- Real-time frontend updates

### ✅ **Parallel Execution Tracking**

- Each component tracks its own parallel operations
- Rich visibility into concurrent workflows
- Structured progress data for sophisticated UIs

### ✅ **Backwards Compatibility**

- Existing simple components continue to work unchanged
- StatefulComponent is purely additive - no breaking changes
- Gradual adoption path - convert components only when needed
- Existing progress events still function

## Migration Path

### Phase 1: Convert Components to StatefulComponent (Optional)

```typescript
// Before - Simple component
const Research = gensx.Component("Research", async (props) => {
  gensx.emitProgress("Starting research...");
  return result;
});

// After - Stateful component (only if you need state composition)
const Research = gensx.StatefulComponent<ResearchState>("Research", (props) => {
  const state = gensx.state("research", initialState);
  const outputPromise = (async () => {
    // ... state updates and async work
    return result;
  })();
  return { output: outputPromise, state };
});

// Simple components can stay unchanged if they don't need state
const GenerateTopics = gensx.Component("GenerateTopics", async (props) => {
  return await generateTopics(props); // No change needed
});
```

### Phase 2: Add State Composition to Workflows

```typescript
// Before
const WriteBlog = gensx.Workflow("WriteBlog", async (props) => {
  const research = await Research(props);
  return result;
});

// After
const WriteBlog = gensx.Workflow("WriteBlog", async (props) => {
  const workflowState = gensx.state("blog", initialState);
  const { output, state } = Research(props);
  workflowState.research.attach(state);
  const research = await output;
  return result;
});
```

### Phase 3: Update Frontend to Use Rich State

```typescript
// Replace progress event parsing with typed state access
const { blogState } = useGensxState<BlogWorkflowState>(
  "/workflows/blog",
  "blog",
);
```

## Comparison with Alternatives

| Approach                 | Reusability | Type Safety | UI Capability | Complexity |
| ------------------------ | ----------- | ----------- | ------------- | ---------- |
| Progress Events          | ✅ High     | ❌ None     | ❌ Limited    | ✅ Low     |
| Global State             | ❌ Poor     | ✅ Good     | ✅ Rich       | ❌ High    |
| Hierarchical Composition | ✅ High     | ✅ Perfect  | ✅ Rich       | ✅ Medium  |

The hierarchical composition approach achieves the best balance across all dimensions, providing the foundation for building sophisticated, type-safe, real-time workflow UIs while maintaining clean, reusable component architectures.
