"""Context management for GenSX components."""

import asyncio
import uuid
from contextvars import ContextVar
from typing import Any, Dict, Optional, TypeVar, Generic, Callable, Awaitable

from .types import Context
from .checkpoint import CheckpointManager
from .exceptions import ContextError

T = TypeVar("T")

# Global context variables
_current_execution_context: ContextVar[Optional["ExecutionContext"]] = ContextVar(
    "current_execution_context", default=None
)
_current_node_id: ContextVar[Optional[str]] = ContextVar("current_node_id", default=None)


class WorkflowContext:
    """Shared context for workflow execution."""

    def __init__(self):
        self.checkpoint_manager = CheckpointManager()
        self.contexts: Dict[str, Any] = {}

    def get_context(self, symbol: str) -> Any:
        """Get a context value by symbol."""
        return self.contexts.get(symbol)

    def set_context(self, symbol: str, value: Any) -> None:
        """Set a context value by symbol."""
        self.contexts[symbol] = value


class ExecutionContext:
    """Manages execution context and workflow state."""

    def __init__(self, context: Dict[str, Any]):
        self.context = context
        self.parent: Optional[ExecutionContext] = None
        self._workflow_context: Optional[WorkflowContext] = None

    async def init(self) -> None:
        """Initialize the execution context."""
        if not self._workflow_context:
            self._workflow_context = WorkflowContext()

    def with_context(self, new_context: Dict[str, Any]) -> "ExecutionContext":
        """Create new context inheriting from current."""
        merged_context = {**self.context, **new_context}
        new_exec_context = ExecutionContext(merged_context)
        new_exec_context.parent = self
        new_exec_context._workflow_context = self._workflow_context
        return new_exec_context

    def get_workflow_context(self) -> WorkflowContext:
        """Get the workflow execution context."""
        if not self._workflow_context:
            # Auto-initialize workflow context if not present
            self._workflow_context = WorkflowContext()
        return self._workflow_context

    def get_current_node_id(self) -> Optional[str]:
        """Get the current node ID."""
        return _current_node_id.get()

    def with_current_node(self, node_id: str, fn: Callable[[], T]) -> T:
        """Execute function with current node context."""
        token = _current_node_id.set(node_id)
        try:
            return fn()
        finally:
            _current_node_id.reset(token)

    async def with_current_node_async(self, node_id: str, fn: Callable[[], Awaitable[T]]) -> T:
        """Execute async function with current node context."""
        token = _current_node_id.set(node_id)
        try:
            return await fn()
        finally:
            _current_node_id.reset(token)


def get_current_context() -> ExecutionContext:
    """Get the current execution context."""
    context = _current_execution_context.get()
    if context is None:
        # Create a default context if none exists
        context = ExecutionContext({})
        # Auto-initialize workflow context for standalone component usage
        context._workflow_context = WorkflowContext()
        _current_execution_context.set(context)
    return context


async def with_context(context: ExecutionContext, fn: Callable[[], Awaitable[T]]) -> T:
    """Execute an async function with the given context."""
    token = _current_execution_context.set(context)
    try:
        return await fn()
    finally:
        _current_execution_context.reset(token)


def create_context(default_value: T, symbol: Optional[str] = None) -> Context[T]:
    """Create a new context with a default value."""
    return Context(default_value, symbol)


def use_context(context: Context[T]) -> T:
    """Use a context value in the current execution."""
    current_context = get_current_context()
    workflow_context = current_context.get_workflow_context()

    value = workflow_context.get_context(context.symbol)
    if value is None:
        return context.default_value
    return value


class ContextProvider:
    """Provides context values to child components."""

    def __init__(self, context: Context[T], value: T):
        self.context = context
        self.value = value

    async def __aenter__(self):
        """Enter the context provider."""
        current_context = get_current_context()
        workflow_context = current_context.get_workflow_context()
        workflow_context.set_context(self.context.symbol, self.value)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit the context provider."""
        # In a more sophisticated implementation, we might restore the previous value
        pass
