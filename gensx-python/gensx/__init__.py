"""
GenSX Python - Build AI workflows using Python components.

This package provides a component-based framework for building LLM workflows
and AI agents with strong typing, async support, and execution tracking.
"""

from .core.component import Component
from .core.workflow import Workflow
from .core.context import create_context, use_context
from .utils.wrap import wrap
from .core.types import ComponentOpts, WorkflowOpts

__version__ = "0.1.0"
__all__ = [
    "Component",
    "Workflow",
    "create_context",
    "use_context",
    "wrap",
    "ComponentOpts",
    "WorkflowOpts",
]
