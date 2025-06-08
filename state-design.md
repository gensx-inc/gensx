# GenSX Hierarchical State Composition Design

## 🚧 Implementation Progress

### ✅ **Completed** (January 2025)

#### Core State Attachment System

- **✅ Property-based attachment API**: `workflowState.attachments.property.attach(childState)`
- **✅ Bidirectional state binding**: Child state updates automatically propagate to parent
- **✅ Method interception**: Child state `update()`, `set()`, `reset()` methods intercepted for propagation
- **✅ Non-broadcasting component state**: `createStateManager()` creates states that don't emit events
- **✅ Broadcasting workflow state**: `state()` function creates states that emit JSON patch events
- **✅ Type-safe attachment interface**: Full TypeScript support with `BroadcastingStateManager<T>`

#### Transport Integration

- **✅ Progress event integration**: State updates flow through existing `emitProgress()` → Redis stream transport
- **✅ JSON patch events**: State changes emit as `StateUpdateEvent` progress events
- **✅ Workflow context connection**: State events properly connected to serverless runtime transport

#### Enhanced State Manager Interface

```typescript
// ✅ IMPLEMENTED
interface BroadcastingStateManager<T> extends StateManager<T> {
  attachments: {
    [K in keyof T]: PropertyAttachment<T[K]>;
  };
}
```

#### Comprehensive Testing

- **✅ 76 total tests passing** (up from 71)
- **✅ State attachment verification**: Multiple child states attached to different properties
- **✅ State propagation verification**: Child updates immediately reflect in parent
- **✅ Event emission verification**: Only workflow states broadcast, component states remain silent
- **✅ Integration test**: Realistic blog workflow with hierarchical composition

### 🔄 **In Progress**

#### StatefulComponent API Alignment

- **⚠️ NEEDS REVIEW**: Current StatefulComponent API uses direct function parameters, design shows decorator-style
- **Current**: `gensx.StatefulComponent("Name", initialState, targetFn)`
- **Design**: `gensx.StatefulComponent<State>("Name")(targetFn)` returning `{ output: Promise<T>, state: StateManager<S> }`

### ❌ **Pending Implementation**

#### React Integration Package

- **❌ `packages/gensx-react`**: React hooks package for frontend state consumption
- **❌ `useGensxState<T>()`**: Hook for consuming typed workflow state in React components
- **✅ Real-time state transport**: State events flow through existing emitProgress → Redis stream infrastructure

#### Advanced State Composition

- **❌ Component-to-component composition**: Nested component state attachment
- **❌ Dynamic attachment/detachment**: Runtime state management
- **❌ State cleanup mechanisms**: Proper attachment lifecycle management

#### Frontend Integration

- **❌ TypeScript type exports**: Workflow state types for frontend consumption
- **✅ State streaming infrastructure**: State events integrate with existing Redis stream transport
- **❌ Example React components**: Reference implementations for state consumption

#### Enhanced Features

- **❌ Granular JSON patches**: More sophisticated delta computation beyond full replace
- **❌ State history/time travel**: Optional state versioning and rollback
- **❌ State validation**: Runtime type checking for attached states

---

## 🎯 Next Steps & Prioritized Roadmap

### **Phase 1: React Integration** (High Priority)

**Goal**: Enable frontend consumption of hierarchical state

1. **Create `packages/gensx-react` package**

   - React hooks for state consumption
   - TypeScript integration for workflow state types
   - Integration with existing Redis stream transport (no new streaming needed)

2. **Implement `useGensxState<T>()` hook**

   ```typescript
   const { state, isLoading, error } = useGensxState<BlogWorkflowState>(
     "/workflows/blog",
     "blog-workflow",
   );
   ```

3. **Example React components**
   - Reference implementations showing state consumption
   - Real-time progress indicators
   - Hierarchical state visualization

### **Phase 2: API Alignment** (Medium Priority)

**Goal**: Align StatefulComponent API with original design

1. **Implement decorator-style StatefulComponent API**

   - Support both current and target APIs during transition
   - Migration guide for existing code
   - Backward compatibility maintenance

2. **Component-to-component composition**
   - Nested state attachment patterns
   - Dynamic state management

### **Phase 3: Production Features** (Lower Priority)

**Goal**: Production-ready enhancements

1. **Enhanced JSON patch computation**

   - Granular delta calculation
   - Optimized state synchronization

2. **State cleanup mechanisms**

   - Attachment lifecycle management
   - Memory leak prevention
   - Dynamic detachment support

3. **Advanced state features**
   - State validation and type checking
   - Optional state history/time travel
   - Performance monitoring and metrics

### **Success Criteria**

- ✅ **Phase 1 Complete**: React frontend can consume typed hierarchical state in real-time
- ✅ **Phase 2 Complete**: StatefulComponent API matches design document exactly
- ✅ **Phase 3 Complete**: Production-ready state management with advanced features

---

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

#### 🔄 **Current Implementation** (January 2025)

Our current StatefulComponent API uses direct function parameters:

```typescript
interface ResearchState {
  topics: string[];
  completedTopics: string[];
  currentTopic?: string;
  phase: "generating" | "researching" | "complete";
}

const initialState: ResearchState = {
  topics: [],
  completedTopics: [],
  phase: "generating",
};

// ✅ CURRENT WORKING API
const Research = gensx.StatefulComponent(
  "Research",
  initialState,
  async (props: ResearchProps, state: StateManager<ResearchState>) => {
    state.update((s) => ({ ...s, phase: "generating" }));

    const topics = await GenerateTopics(props);
    state.update((s) => ({
      ...s,
      topics: topics.object.topics,
      phase: "researching",
    }));

    // Parallel execution with individual state tracking
    const webResearchPromises = topics.object.topics.map(async (topic) => {
      state.update((s) => ({ ...s, currentTopic: topic }));
      const result = await WebResearch({ topic });
      state.update((s) => ({
        ...s,
        completedTopics: [...s.completedTopics, topic],
      }));
      return result;
    });

    const webResearch = await Promise.all(webResearchPromises);
    state.update((s) => ({ ...s, phase: "complete" }));

    return { topics: topics.object.topics, webResearch };
  },
);

// Usage - returns { output: Promise<T>, state: StateManager<S> }
const { output: researchPromise, state: researchState } = Research(props);
```

#### 🎯 **Target Design API** (Future)

The eventual target API should return state explicitly:

```typescript
// 🎯 TARGET API (not yet implemented)
const Research = gensx.StatefulComponent<ResearchState>(
  "Research",
  (props: ResearchProps) => {
    // Component manages its own state
    const researchState = gensx.createStateManager("research", {
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

      // ... rest of async work ...

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

#### ✅ **Current Working Implementation**

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
  // ✅ WORKING: Workflow defines complete state shape
  const workflowState = gensx.state<BlogWorkflowState>("blog", {
    overall: {
      phase: "research",
      startTime: new Date().toISOString(),
      progress: { current: 0, total: 4 },
    },
    research: { topics: [], completedTopics: [], phase: "generating" }, // Initial state
    draft: { sections: [], wordCount: 0, status: "draft" },
    editorial: { reviews: [], status: "pending" },
  });

  // ✅ WORKING: Execute component and get state reference
  const { output: researchPromise, state: researchState } = Research({
    title: props.title,
    prompt: props.prompt,
  });

  // ✅ WORKING: Explicit state attachment via property-based API
  workflowState.attachments.research.attach(researchState);

  const research = await researchPromise;

  // ✅ WORKING: Continue with other components...
  const { output: draftPromise, state: draftState } = WriteDraft({
    title: props.title,
    outline: outline.object,
    research: research,
  });

  workflowState.attachments.draft.attach(draftState);
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

### ✅ **Current Implementation**

```typescript
// ✅ IMPLEMENTED: Base state manager (component states)
interface StateManager<T> {
  get(): T;
  update(updater: (state: T) => T): void;
  set(newState: T): void;
  reset(): void;
}

// ✅ IMPLEMENTED: Property attachment interface
interface PropertyAttachment<T> {
  attach(childState: StateManager<T>): void;
}

// ✅ IMPLEMENTED: Workflow state manager with attachment capabilities
interface BroadcastingStateManager<T> extends StateManager<T> {
  attachments: {
    [K in keyof T]: PropertyAttachment<T[K]>;
  };
}

// ✅ IMPLEMENTED: State creation functions
function createStateManager<T>(name: string, initialState: T): StateManager<T>;
function state<T>(name: string, initialState?: T): BroadcastingStateManager<T>;

// ✅ IMPLEMENTED: Component APIs
type SimpleComponent<TProps, TOutput> = (props: TProps) => Promise<TOutput>;

// ✅ CURRENT: StatefulComponent API (direct parameters)
function StatefulComponent<TProps, TState, TOutput>(
  name: string,
  initialState: TState,
  fn: (props: TProps, state: StateManager<TState>) => Promise<TOutput>,
): (props: TProps) => { output: Promise<TOutput>; state: StateManager<TState> };

// ✅ IMPLEMENTED: Component constructor
function Component<TProps, TOutput>(
  name: string,
  fn: (props: TProps) => Promise<TOutput>,
): (props: TProps) => Promise<TOutput>;
```

### 🎯 **Target API** (Future Enhancement)

```typescript
// 🎯 TARGET: Enhanced StatefulComponent API (decorator-style)
function StatefulComponent<TState>(name: string) {
  return function<TProps, TOutput>(
    fn: (props: TProps) => {
      output: Promise<TOutput>;
      state: StateManager<TState>;
    }
  ): (props: TProps) => {
    output: Promise<TOutput>;
    state: StateManager<TState>;
  };
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
workflowState.attachments.research.attach(researchState);

// This creates a bidirectional binding:
// 1. researchState updates flow to workflowState.research
// 2. workflowState.research gets the current researchState value
// 3. JSON patches are computed and emitted for the composed state
```

### Existing Transport Integration

State events integrate seamlessly with GenSX's existing progress event system:

```typescript
// ✅ WORKING: State updates flow through existing transport
workflowState.update((s) => ({ ...s, phase: "complete" }));

// This triggers the following flow:
// 1. updateStateWithDelta() computes JSON patch
// 2. emitStateUpdate() creates StateUpdateEvent
// 3. workflowContext.progressListener() receives event
// 4. Serverless runtime connects progressListener to emitProgress()
// 5. emitProgress() sends to Redis streams for frontend consumption

// ✅ NO NEW TRANSPORT NEEDED - reuses existing infrastructure
```

### Opt-in State Streaming

State updates only emit progress events when created as workflow state:

```typescript
// ❌ Component state updates do NOT emit events (by design)
const componentState = gensx.createStateManager("component", initialState);
componentState.update(s => ({ ...s, phase: "complete" })); // No event emitted

// ✅ Workflow state updates DO emit events
const workflowState = gensx.state("workflow", initialState);
workflowState.update(s => ({ ...s, phase: "complete" })); // Event emitted → Redis stream

// ✅ Attached component updates flow through workflow state
workflowState.attachments.research.attach(componentState); // Now component updates emit events

// Event format (flows through existing emitProgress):
{
  type: "state-update",
  stateName: "workflow",  // Workflow state name
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
