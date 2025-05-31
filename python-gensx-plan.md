# GenSX Python Port - Implementation Plan

## Overview

Port the `@gensx/core` TypeScript/JavaScript package to Python while maintaining the core functionality and developer experience.

## Current GenSX Core Features Analysis

### 1. Component System (`component.ts`)

- **Component()**: Wrapper that converts functions into GenSX components
- **Workflow()**: Top-level execution wrapper with checkpointing
- **Props & Return Types**: Strong typing with TypeScript interfaces
- **Execution Context**: Tracks current node, workflow context, checkpointing
- **Streaming Support**: Handles AsyncIterators and ReadableStreams
- **Error Handling**: Serializes errors for checkpointing

### 2. Execution Model

- **Tree-based**: JSX creates a tree structure that gets executed
- **Dependency Tracking**: Automatic resolution of component dependencies
- **Parallel Execution**: Components run in parallel when dependencies allow
- **Child Functions**: JSX children can be functions that receive parent output

### 3. SDK Wrapping (`wrap.ts`)

- **Automatic Wrapping**: Converts any object/class methods into GenSX components
- **Proxy Pattern**: Uses JavaScript Proxy to intercept method calls
- **Path Tracking**: Builds component names from object property paths
- **Replacement Implementations**: Allows custom implementations for specific methods

### 4. Context Management (`context.ts`)

- **ExecutionContext**: Hierarchical context with inheritance
- **WorkflowContext**: Shared state across workflow execution
- **Current Node Tracking**: Maintains execution tree state
- **Context Providers**: Similar to React Context API

### 5. Checkpointing (`checkpoint.ts`)

- **Execution Tracking**: Records all component executions
- **Node Management**: Tree structure with parent/child relationships
- **Metadata**: Stores additional information about executions
- **Persistence**: Saves execution state for debugging/replay

## Python Implementation Plan

### Phase 1: Core Foundation

#### 1.1 Package Structure

```
gensx/
├── __init__.py
├── core/
│   ├── __init__.py
│   ├── component.py      # Component decorator and execution
│   ├── workflow.py       # Workflow wrapper and execution
│   ├── context.py        # Context management
│   ├── types.py          # Type definitions and protocols
│   └── exceptions.py     # Custom exceptions
├── execution/
│   ├── __init__.py
│   ├── engine.py         # Core execution engine
│   └── resolver.py       # Dependency resolution
├── utils/
│   ├── __init__.py
│   └── streaming.py      # Async iterator utilities
└── tests/
    ├── __init__.py
    ├── test_component.py
    └── test_workflow.py
```

#### 1.2 Core Component Implementation

```python
from typing import TypeVar, Callable, Any, Awaitable, Union
from functools import wraps
import asyncio

P = TypeVar('P')  # Props type
R = TypeVar('R')  # Return type

def Component(name: str,
              target: Callable[[P], Union[R, Awaitable[R]]],
              opts: Optional[ComponentOpts] = None) -> Callable[[P], Awaitable[R]]:
    """Convert a function into a GenSX component"""
    pass

def Workflow(name: str,
             target: Callable[[P], Union[R, Awaitable[R]]],
             opts: Optional[WorkflowOpts] = None) -> Callable[[P], Awaitable[R]]:
    """Create an executable workflow from a component"""
    pass
```

#### 1.3 Basic Execution Engine

- Implement tree traversal
- Handle async function execution
- Basic dependency resolution
- Simple context management

### Phase 2: Advanced Features

#### 2.1 Streaming Support

```python
import asyncio
from typing import AsyncIterator, Iterator

class StreamingResult:
    """Wrapper for streaming results that can be consumed multiple times"""

    async def __aiter__(self) -> AsyncIterator[Any]:
        """Allow async iteration over streaming results"""
        pass

    def is_streaming(self) -> bool:
        """Check if result is a streaming type"""
        pass
```

#### 2.2 Context Management

```python
from contextvars import ContextVar
from typing import Dict, Any, Optional

class ExecutionContext:
    """Manages execution context and workflow state"""

    def __init__(self, context: Dict[str, Any]):
        self.context = context
        self.parent: Optional[ExecutionContext] = None

    def with_context(self, new_context: Dict[str, Any]) -> 'ExecutionContext':
        """Create new context inheriting from current"""
        pass

    def get_workflow_context(self) -> 'WorkflowContext':
        """Get the workflow execution context"""
        pass
```

#### 2.3 Parallel Execution

- Use `asyncio.gather()` for parallel component execution
- Implement dependency graph analysis
- Handle result collection and ordering

### Phase 3: SDK Wrapping & Advanced Features

#### 3.1 SDK Wrapping

```python
from typing import Any, Dict, List, Callable
import inspect

def wrap(sdk: Any, opts: Optional[WrapOptions] = None) -> Any:
    """Wrap an object/class to convert methods into GenSX components"""

    class ComponentProxy:
        def __init__(self, target: Any, path: List[str]):
            self._target = target
            self._path = path

        def __getattr__(self, name: str) -> Any:
            attr = getattr(self._target, name)
            new_path = self._path + [name]

            if callable(attr):
                # Convert to component
                component_name = ".".join(new_path)
                return Component(component_name, attr)
            elif hasattr(attr, '__dict__'):
                # Wrap nested objects
                return ComponentProxy(attr, new_path)
            else:
                # Return primitives as-is
                return attr

    return ComponentProxy(sdk, [sdk.__class__.__name__])
```

#### 3.2 Checkpointing System

```python
from datetime import datetime
from typing import Dict, Any, List, Optional
import uuid

class CheckpointManager:
    """Manages execution checkpoints for debugging and replay"""

    def __init__(self):
        self.nodes: Dict[str, ExecutionNode] = {}
        self.root: Optional[ExecutionNode] = None

    def add_node(self, component_info: Dict[str, Any], parent_id: Optional[str] = None) -> str:
        """Add a new execution node"""
        pass

    def complete_node(self, node_id: str, result: Any) -> None:
        """Mark node as completed with result"""
        pass

    def add_metadata(self, node_id: str, metadata: Dict[str, Any]) -> None:
        """Add metadata to a node"""
        pass
```

### Phase 4: Developer Experience

#### 4.1 Type Safety with Pydantic

```python
from pydantic import BaseModel, validator
from typing import Generic, TypeVar

class ComponentBase(BaseModel, Generic[P, R]):
    """Base class for typed components"""

    class Config:
        arbitrary_types_allowed = True

    @validator('*', pre=True)
    def validate_types(cls, v):
        """Runtime type validation"""
        pass
```

#### 4.2 Error Handling

```python
import traceback
from typing import Dict, Any

def serialize_error(error: Exception) -> Dict[str, Any]:
    """Serialize exception for checkpointing"""
    return {
        'name': error.__class__.__name__,
        'message': str(error),
        'traceback': traceback.format_exc(),
        'type': 'error'
    }
```

#### 4.3 Testing Framework

```python
import pytest
from gensx import Component, Workflow, execute

@pytest.mark.asyncio
async def test_basic_component():
    """Test basic component functionality"""

    @Component("TestComponent")
    async def test_component(props: dict) -> str:
        return f"Hello {props['name']}"

    result = await test_component({"name": "World"})
    assert result == "Hello World"
```

## Implementation Order

### Week 1: Foundation

- [ ] Package structure setup
- [ ] Basic Component decorator
- [ ] Simple execution engine
- [ ] Basic async support
- [ ] Initial tests

### Week 2: Core Features

- [ ] Workflow wrapper
- [ ] Context management
- [ ] Dependency resolution
- [ ] Parallel execution
- [ ] Error handling

### Week 3: Advanced Features

- [ ] Streaming support
- [ ] SDK wrapping
- [ ] Checkpointing basics
- [ ] Type validation

### Week 4: Polish & Testing

- [ ] Comprehensive test suite
- [ ] Documentation
- [ ] Examples
- [ ] Performance optimization
- [ ] Error message improvements

## Key Design Decisions

### 1. Python-First Design

- Use Python idioms (decorators, context managers, async/await)
- Leverage asyncio for concurrency
- Use typing module for type safety
- Pydantic for runtime validation

### 2. Async by Default

- All components return `Awaitable[T]`
- Use `asyncio.gather()` for parallel execution
- Support both sync and async component functions

### 3. Functional Approach

- Components are pure functions when possible
- Immutable execution context
- Side effects isolated to specific contexts

### 4. Developer Experience

- Clear error messages
- Type hints everywhere
- Comprehensive documentation
- Easy debugging with checkpoints

## API Compatibility

### Component Definition

```python
# TypeScript (original)
const MyComponent = gensx.Component<Props, Return>("MyComponent", async (props) => {
    return await doSomething(props.input);
});

# Python (new)
@Component("MyComponent")
async def my_component(props: Props) -> Return:
    return await do_something(props.input)

# Or functional style
my_component = Component("MyComponent", lambda props: do_something(props.input))
```

### Workflow Execution

```python
# TypeScript (original)
const result = await gensx.execute(<MyWorkflow input="test" />);

# Python (new)
@Workflow("MyWorkflow")
async def my_workflow(props: dict) -> str:
    return await my_component(props)

result = await my_workflow.run({"input": "test"})
```

This plan maintains the core philosophy and functionality of GenSX while adapting it to Python's strengths and conventions.
