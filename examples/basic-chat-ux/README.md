# GenSX Blog Writer React Demo

This is a comprehensive demonstration of **GenSX Hierarchical State Composition** with real-time React integration. It showcases how complex multi-component workflows can stream rich state updates to the frontend in real-time with full TypeScript type safety.

## 🚀 What This Demo Shows

### 1. **Real-time Workflow State Streaming**

- Watch as a complex blog writing workflow executes with live state updates
- See individual component states (Research, Outline, Draft, Editorial) update in real-time
- Experience the power of hierarchical state composition in action

### 2. **Full TypeScript Integration**

- Shared types between workflow backend and React frontend
- Complete type safety for workflow inputs, outputs, and state structures
- Demonstrates the power of having workflows and frontend in the same codebase

### 3. **GenSX React Hooks in Action**

- `useWorkflowWithState` - Combined async execution + state streaming
- Real-time progress visualization with rich hierarchical data
- Automatic reconnection and error handling

### 4. **Production-Ready Architecture**

- Dual environment support (development + production)
- Clean component architecture with separation of concerns
- Beautiful, responsive UI with dark mode support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  BlogInputForm  │  │ BlogProgressViewer│  │BlogResultViewer│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                    │      │
│           └─────────────────────┼────────────────────┘      │
│                                 │                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           useWorkflowWithState Hook                     │ │
│  │  • Starts workflow asynchronously                      │ │
│  │  • Streams state via Server-Sent Events               │ │
│  │  • Applies JSON patches for efficient updates         │ │
│  │  • Full TypeScript type safety                        │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     @gensx/react          │
                    │   React Hooks Package     │
                    └─────────────┬─────────────┘
                                 │
┌─────────────────────────────────────────────────────────────┐
│                  GenSX Workflow                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────┐ │
│  │  Research   │→ │   Outline   │→ │    Draft    │→ │Edit │ │
│  │ Component   │  │ Component   │  │ Component   │  │orial│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────┘ │
│         │                 │                 │          │    │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Hierarchical State Composition               │ │
│  │  • Each component manages its own state               │ │
│  │  • States are explicitly attached to workflow state  │ │
│  │  • Real-time updates via JSON patches                │ │
│  │  • Type-safe state attachment                         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Features Demonstrated

### **Hierarchical State Composition**

- **Research Component**: Tracks topic generation, web research progress, current research item
- **Outline Component**: Shows section planning, structure creation, key points
- **Draft Component**: Word count tracking, section-by-section writing progress
- **Editorial Component**: Review feedback, improvement tracking, final polish

### **Real-time State Streaming**

- **Server-Sent Events**: Efficient real-time communication
- **JSON Patch Updates**: Only changed data is transmitted
- **Automatic Reconnection**: Handles network interruptions gracefully
- **State Synchronization**: Frontend state stays perfectly in sync with workflow

### **Type Safety**

- **Shared Types**: Same TypeScript interfaces used in workflow and frontend
- **Generic Hooks**: Full type inference for inputs, outputs, and state
- **Compile-time Safety**: Catch state structure mismatches at build time

## 🚦 Getting Started

### Prerequisites

- Node.js 18+
- The GenSX dev server running on port 1337 (for workflow execution)

### Running the Demo

1. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

2. **Start the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

4. **Start a workflow:**
   - Fill in the blog title and prompt
   - Optionally set word count and reference URL
   - Click "Generate Blog Post"
   - Watch the real-time state updates!

## 🔧 How It Works

### 1. **Workflow Execution**

```typescript
const { start, state, isLoading, error, isComplete } = useWorkflowWithState<
  BlogInput,
  BlogWorkflowState
>("/blog-writer", "blog-workflow");
```

### 2. **Real-time State Updates**

The hook automatically:

- Connects to the GenSX dev server
- Starts the workflow asynchronously
- Opens a Server-Sent Events stream
- Applies JSON patches to update state
- Provides typed state object to React components

### 3. **State Visualization**

Rich progress components show:

- Overall workflow progress with phase timeline
- Individual component states with detailed metrics
- Real-time updates as the workflow executes
- Debug view of raw state data

## 🎨 UI Components

### **BlogInputForm**

- Clean form with validation
- Optional parameters (word count, reference URL)
- Loading states and error handling
- Pre-filled with example data

### **BlogProgressViewer**

- Real-time progress visualization
- Phase-by-phase breakdown
- Component-specific state tracking
- Interactive progress bars and status badges

### **BlogResultViewer**

- Final blog post display
- Metadata summary
- Copy to clipboard functionality
- Markdown download
- Technical details about the generation process

## 🌟 Why This Matters

This demo showcases the **future of workflow UIs**:

1. **Rich State Visibility**: Instead of simple progress bars, see exactly what each component is doing
2. **Real-time Updates**: No polling - state updates flow instantly to the UI
3. **Type Safety**: Shared types ensure frontend and backend stay in sync
4. **Component Reusability**: Same workflow components can be used in different contexts
5. **Scalable Architecture**: Hierarchical composition scales to complex workflows

## 🔮 Production Deployment

For production, simply update the hook configuration:

```typescript
const { start, state } = useWorkflowWithState("/blog-writer", "blog", {
  production: {
    org: "your-org",
    project: "blog-writer",
    environment: "production",
    apiKey: process.env.REACT_APP_GENSX_API_KEY!,
  },
});
```

The same React code works seamlessly with both development and production GenSX deployments!

## 📚 Learn More

- **GenSX Documentation**: Learn about workflow composition and state management
- **React Hooks Package**: Explore the full `@gensx/react` API
- **State Design**: Read about hierarchical state composition patterns

---

**Built with GenSX Hierarchical State Composition** 🚀
