"""Workflow functionality for GenSX."""

import os
from functools import wraps
from typing import Any, Awaitable, Callable, Optional, TypeVar

from .component import Component
from .context import ExecutionContext, with_context
from .exceptions import WorkflowError
from .types import WorkflowOpts

P = TypeVar("P")
R = TypeVar("R")


def Workflow(
    name: str,
    target: Optional[Callable] = None,
    opts: Optional[WorkflowOpts] = None,
) -> Callable:
    """
    Create an executable workflow from a component.

    Can be used as a decorator or function wrapper:

    @Workflow("MyWorkflow")
    def my_workflow(props):
        return "result"

    # Or as a function wrapper
    my_workflow = Workflow("MyWorkflow", my_function)
    """

    def decorator(func: Callable) -> Callable:
        workflow_opts = opts or WorkflowOpts()
        workflow_name = workflow_opts.name or name

        # Create a component from the function
        component = Component(workflow_name, func, workflow_opts)

        @wraps(func)
        async def workflow_wrapper(*args, **kwargs) -> Any:
            # Create new execution context for the workflow
            context = ExecutionContext({})
            await context.init()

            # Configure checkpoint manager
            workflow_context = context.get_workflow_context()
            checkpoint_manager = workflow_context.checkpoint_manager

            # Set workflow name
            checkpoint_manager.set_workflow_name(workflow_name)

            # Configure URL printing (default to True unless in CI)
            default_print_url = not bool(os.environ.get("CI"))
            checkpoint_manager.set_print_url(
                workflow_opts.print_url if workflow_opts.print_url is not None else default_print_url
            )

            try:
                # Execute the component within the workflow context
                async def execute_component():
                    return await component(*args, **kwargs)

                result = await with_context(context, execute_component)

                # Add workflow metadata if provided
                if workflow_opts.metadata and checkpoint_manager.root:
                    checkpoint_manager.add_metadata(
                        checkpoint_manager.root.id,
                        workflow_opts.metadata
                    )

                return result

            except Exception as error:
                raise WorkflowError(workflow_name, str(error), error) from error
            finally:
                # Wait for any pending checkpoint updates
                await checkpoint_manager.wait_for_pending_updates()

        # Add a run method for convenience
        workflow_wrapper.run = workflow_wrapper

        # Mark as GenSX workflow
        workflow_wrapper.__gensx_workflow__ = True
        workflow_wrapper.__gensx_name__ = workflow_name

        return workflow_wrapper

    # Handle both decorator patterns
    if target is not None:
        # Called as Workflow("name", function)
        return decorator(target)
    else:
        # Called as @Workflow("name") or @Workflow("name", opts=...)
        return decorator


def is_workflow(obj: Any) -> bool:
    """Check if an object is a GenSX workflow."""
    return hasattr(obj, "__gensx_workflow__") and obj.__gensx_workflow__


def get_workflow_name(obj: Any) -> Optional[str]:
    """Get the name of a GenSX workflow."""
    return getattr(obj, "__gensx_name__", None)
