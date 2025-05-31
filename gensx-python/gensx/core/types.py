"""Type definitions and protocols for GenSX components."""

from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    Generic,
    List,
    Optional,
    Protocol,
    TypeVar,
    Union,
)
from typing_extensions import ParamSpec

# Type variables
P = ParamSpec("P")  # Parameters type
R = TypeVar("R")  # Return type
T = TypeVar("T")  # Generic type

# Core types
MaybePromise = Union[T, Awaitable[T]]
Primitive = Union[str, int, float, bool, None]


class ComponentOpts:
    """Options for configuring component behavior."""

    def __init__(
        self,
        secret_props: Optional[List[str]] = None,
        secret_outputs: bool = False,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        aggregator: Optional[Callable[[List[Any]], Any]] = None,
        streaming_result_key: Optional[str] = None,
    ):
        self.secret_props = secret_props or []
        self.secret_outputs = secret_outputs
        self.name = name
        self.metadata = metadata or {}
        self.aggregator = aggregator
        self.streaming_result_key = streaming_result_key


class WorkflowOpts(ComponentOpts):
    """Options for configuring workflow behavior."""

    def __init__(
        self,
        print_url: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ):
        super().__init__(metadata=metadata, **kwargs)
        self.print_url = print_url


class ComponentFunction(Protocol[P, R]):
    """Protocol for component functions."""

    def __call__(self, *args: P.args, **kwargs: P.kwargs) -> MaybePromise[R]:
        """Execute the component function."""
        ...


class AsyncComponentFunction(Protocol[P, R]):
    """Protocol for async component functions."""

    async def __call__(self, *args: P.args, **kwargs: P.kwargs) -> R:
        """Execute the async component function."""
        ...


class Context(Generic[T]):
    """Context for sharing data across components."""

    def __init__(self, default_value: T, symbol: Optional[str] = None):
        self.default_value = default_value
        self.symbol = symbol or f"gensx_context_{id(self)}"


class ExecutionNode:
    """Represents a node in the execution tree."""

    def __init__(
        self,
        id: str,
        component_name: str,
        start_time: float,
        props: Dict[str, Any],
        parent_id: Optional[str] = None,
    ):
        self.id = id
        self.component_name = component_name
        self.start_time = start_time
        self.props = props
        self.parent_id = parent_id
        self.children: List["ExecutionNode"] = []
        self.result: Any = None
        self.error: Optional[Exception] = None
        self.metadata: Dict[str, Any] = {}
        self.end_time: Optional[float] = None


class StreamingResult(Generic[T]):
    """Wrapper for streaming results that can be consumed multiple times."""

    def __init__(self, source: Any):
        self._source = source
        self._cached_results: Optional[List[T]] = None

    async def __aiter__(self):
        """Allow async iteration over streaming results."""
        if self._cached_results is not None:
            for item in self._cached_results:
                yield item
        else:
            self._cached_results = []
            async for item in self._source:
                self._cached_results.append(item)
                yield item

    def is_streaming(self) -> bool:
        """Check if result is a streaming type."""
        return hasattr(self._source, "__aiter__") or hasattr(self._source, "__iter__")
