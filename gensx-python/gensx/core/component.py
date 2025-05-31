"""Core component functionality for GenSX."""

import asyncio
import inspect
import traceback
from functools import wraps
from typing import Any, Awaitable, Callable, Dict, Optional, TypeVar, Union

from .context import get_current_context
from .checkpoint import STREAMING_PLACEHOLDER
from .exceptions import ComponentError
from .types import ComponentOpts, StreamingResult

P = TypeVar("P")
R = TypeVar("R")


def serialize_error(error: Exception) -> Dict[str, Any]:
    """Serialize exception for checkpointing."""
    return {
        "name": error.__class__.__name__,
        "message": str(error),
        "traceback": traceback.format_exc(),
        "type": "error",
    }


def is_async_iterable(obj: Any) -> bool:
    """Check if object is an async iterable."""
    return hasattr(obj, "__aiter__")


def is_iterable(obj: Any) -> bool:
    """Check if object is iterable (but not string)."""
    return hasattr(obj, "__iter__") and not isinstance(obj, (str, bytes))


async def handle_streaming_result(
    result: Any, aggregator: Optional[Callable[[list], Any]] = None
) -> Any:
    """Handle streaming results by wrapping them in StreamingResult."""
    if is_async_iterable(result):
        return StreamingResult(result)
    elif is_iterable(result) and not isinstance(result, (dict, str, bytes)):
        return StreamingResult(result)
    return result


def Component(
    name: str,
    target: Optional[Callable] = None,
    opts: Optional[ComponentOpts] = None,
) -> Union[Callable, Callable[[Callable], Callable]]:
    """
    Convert a function into a GenSX component.

    Can be used as a decorator with or without arguments:

    @Component("MyComponent")
    def my_component(props):
        return "result"

    # Or with options
    @Component("MyComponent", opts=ComponentOpts(secret_outputs=True))
    def my_component(props):
        return "result"

    # Or as a function wrapper
    my_component = Component("MyComponent", my_function)
    """

    def decorator(func: Callable) -> Callable:
        component_opts = opts or ComponentOpts()
        component_name = component_opts.name or name

        @wraps(func)
        async def component_wrapper(*args, **kwargs) -> Any:
            # Get current execution context (DO NOT create new one like Workflow does)
            context = get_current_context()
            workflow_context = context.get_workflow_context()
            checkpoint_manager = workflow_context.checkpoint_manager
            current_node_id = context.get_current_node_id()

            # Prepare props for checkpointing (filter out internal args)
            props = {}
            if args:
                # If first argument looks like props dict, use it
                if len(args) == 1 and isinstance(args[0], dict):
                    props = {
                        k: v for k, v in args[0].items()
                        if k not in ("children", "component_opts")
                    }
                else:
                    # Convert positional args to props
                    sig = inspect.signature(func)
                    param_names = list(sig.parameters.keys())
                    props = dict(zip(param_names, args))

            # Add keyword arguments
            props.update({
                k: v for k, v in kwargs.items()
                if k not in ("children", "component_opts")
            })

            # Create checkpoint node
            node_id = checkpoint_manager.add_node(
                {
                    "component_name": component_name,
                    "props": props,
                    "component_opts": component_opts,
                },
                current_node_id,
            )

            # Add metadata if provided
            if component_opts.metadata:
                checkpoint_manager.add_metadata(node_id, component_opts.metadata)

            try:
                # Execute the function with current node context
                async def execute_func():
                    result = func(*args, **kwargs)
                    # Handle async results within the context
                    if inspect.iscoroutine(result):
                        result = await result
                    return result

                # Execute within node context and await
                result = await context.with_current_node_async(node_id, execute_func)

                # Handle streaming results
                if (component_opts.streaming_result_key or
                    is_async_iterable(result) or
                    (is_iterable(result) and not isinstance(result, (dict, str, bytes)))):
                    result = await handle_streaming_result(result, component_opts.aggregator)

                # Complete the checkpoint
                checkpoint_manager.complete_node(node_id, result)
                return result

            except Exception as error:
                # Log error in checkpoint
                checkpoint_manager.add_metadata(node_id, {
                    "error": serialize_error(error)
                })
                checkpoint_manager.complete_node(node_id, None)

                # Re-raise as ComponentError
                raise ComponentError(component_name, str(error), error) from error

        # Mark as GenSX component
        component_wrapper.__gensx_component__ = True
        component_wrapper.__gensx_name__ = component_name

        return component_wrapper

    # Handle both decorator patterns
    if target is not None:
        # Called as Component("name", function)
        return decorator(target)
    else:
        # Called as @Component("name") or @Component("name", opts=...)
        return decorator


def is_component(obj: Any) -> bool:
    """Check if an object is a GenSX component."""
    return hasattr(obj, "__gensx_component__") and obj.__gensx_component__


def get_component_name(obj: Any) -> Optional[str]:
    """Get the name of a GenSX component."""
    return getattr(obj, "__gensx_name__", None)
