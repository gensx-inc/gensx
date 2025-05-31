"""
Utility functions for executing workflows with checkpoint tracking in tests.

This module provides helper functions to execute GenSX components and workflows
while capturing and analyzing their checkpoint data for verification.
"""

import asyncio
import base64
import gzip
import json
import time
from typing import Any, Dict, List, Optional, Callable, TypeVar
from unittest.mock import Mock, patch

from gensx import Component, Workflow, WorkflowOpts
from gensx.core.checkpoint import CheckpointManager, ExecutionNodeDict
from gensx.core.context import ExecutionContext, WorkflowContext, with_context

P = TypeVar("P")
R = TypeVar("R")


class MockResponse:
    """Mock HTTP response for checkpoint API calls."""

    def __init__(self, data: Dict[str, Any], status: int = 200):
        self.data = data
        self.status = status
        self.ok = status < 400

    async def json(self) -> Dict[str, Any]:
        return self.data

    async def text(self) -> str:
        return json.dumps(self.data)


class CheckpointCapture:
    """Captures checkpoint data during test execution."""

    def __init__(self):
        self.checkpoints: List[ExecutionNodeDict] = []
        self.api_calls: List[Dict[str, Any]] = []
        self.workflow_names: List[str] = []

    def add_checkpoint(self, checkpoint_data: Dict[str, Any]) -> None:
        """Add a captured checkpoint."""
        try:
            # Extract the execution data
            if "rawExecution" in checkpoint_data:
                compressed_execution = base64.b64decode(checkpoint_data["rawExecution"])
                decompressed_execution = gzip.decompress(compressed_execution)
                execution_data = json.loads(decompressed_execution.decode("utf-8"))

                # Convert to ExecutionNodeDict
                checkpoint = self._dict_to_execution_node(execution_data)
                self.checkpoints.append(checkpoint)

            # Capture workflow name
            if "workflowName" in checkpoint_data:
                self.workflow_names.append(checkpoint_data["workflowName"])

            # Store the raw API call
            self.api_calls.append(checkpoint_data)

        except Exception as error:
            print(f"Failed to parse checkpoint data: {error}")

    def _dict_to_execution_node(self, data: Dict[str, Any]) -> ExecutionNodeDict:
        """Convert dictionary data to ExecutionNodeDict."""
        node = ExecutionNodeDict(
            id=data["id"],
            component_name=data["componentName"],
            start_time=data["startTime"],
            props=data.get("props", {}),
            parent_id=data.get("parentId")
        )

        node.end_time = data.get("endTime")
        node.output = data.get("output")
        node.metadata = data.get("metadata", {})

        # Recursively convert children
        for child_data in data.get("children", []):
            child_node = self._dict_to_execution_node(child_data)
            node.children.append(child_node)

        return node


async def execute_with_checkpoints(
    component_fn: Callable[[P], R],
    props: P,
    options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute a component with checkpoint tracking.

    Returns both the execution result and captured checkpoints for verification.
    """
    options = options or {}
    capture = CheckpointCapture()

    # Mock the checkpoint manager's API writing
    original_write_checkpoint = CheckpointManager._write_checkpoint

    async def mock_write_checkpoint(self: CheckpointManager) -> None:
        """Mock checkpoint writing that captures data instead of sending to API."""
        if not self.root:
            return

        try:
            # Create masked copy like the real implementation
            masked_root_dict = self._mask_execution_tree(self.root)
            steps = self._count_steps(self.root)

            # Prepare execution data
            execution_data = {
                **masked_root_dict,
                "updatedAt": int(time.time() * 1000),
            }

            # Compress execution data
            compressed_execution = gzip.compress(
                json.dumps(execution_data).encode("utf-8")
            )
            base64_compressed_execution = base64.b64encode(compressed_execution).decode("ascii")

            # Prepare payload
            workflow_name = self.workflow_name or self.root.component_name
            payload = {
                "executionId": self.root.id,
                "version": self.version,
                "schemaVersion": 2,
                "workflowName": workflow_name,
                "startedAt": int(self.root.start_time * 1000),
                "completedAt": int(self.root.end_time * 1000) if self.root.end_time else None,
                "rawExecution": base64_compressed_execution,
                "steps": steps,
                "runtime": self.runtime,
                "runtimeVersion": self.runtime_version,
                "executionRunId": self.execution_run_id,
            }

            # Capture the checkpoint data
            capture.add_checkpoint(payload)

            # Set trace ID for consistency
            self.trace_id = f"test-trace-{self.root.id}"

        except Exception as error:
            print(f"Mock checkpoint write failed: {error}")

        # Always increment version
        self.version += 1

    # Patch the checkpoint writing method
    with patch.object(CheckpointManager, '_write_checkpoint', mock_write_checkpoint):
        # Create execution context with checkpoint manager
        context = ExecutionContext({})
        await context.init()
        workflow_context = context.get_workflow_context()

        # Configure checkpoint manager for testing
        checkpoint_manager = workflow_context.checkpoint_manager
        checkpoint_manager.checkpoints_enabled = True
        checkpoint_manager.api_key = "test-api-key"
        checkpoint_manager.org = "test-org"

        # Create component decorator
        component_name = options.get("name", "TestComponent")
        component = Component(component_name, component_fn)

        # Execute with context
        async def execute_component():
            return await component(props)

        result = await with_context(context, execute_component)

        # Wait for any pending checkpoints
        await checkpoint_manager.wait_for_pending_updates()

        return {
            "result": result,
            "checkpoints": capture.checkpoints,
            "checkpoint_manager": checkpoint_manager,
            "api_calls": capture.api_calls,
            "workflow_names": capture.workflow_names,
        }


async def execute_workflow_with_checkpoints(
    component_fn: Callable[[P], R],
    props: P,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Execute a workflow with checkpoint tracking.

    Returns execution result, error (if any), and captured checkpoints.
    """
    capture = CheckpointCapture()

    # Mock the checkpoint manager's API writing (same as above)
    original_write_checkpoint = CheckpointManager._write_checkpoint

    async def mock_write_checkpoint(self: CheckpointManager) -> None:
        """Mock checkpoint writing that captures data instead of sending to API."""
        if not self.root:
            return

        try:
            masked_root_dict = self._mask_execution_tree(self.root)
            steps = self._count_steps(self.root)

            execution_data = {
                **masked_root_dict,
                "updatedAt": int(time.time() * 1000),
            }

            compressed_execution = gzip.compress(
                json.dumps(execution_data).encode("utf-8")
            )
            base64_compressed_execution = base64.b64encode(compressed_execution).decode("ascii")

            workflow_name = self.workflow_name or self.root.component_name
            payload = {
                "executionId": self.root.id,
                "version": self.version,
                "schemaVersion": 2,
                "workflowName": workflow_name,
                "startedAt": int(self.root.start_time * 1000),
                "completedAt": int(self.root.end_time * 1000) if self.root.end_time else None,
                "rawExecution": base64_compressed_execution,
                "steps": steps,
            }

            capture.add_checkpoint(payload)
            self.trace_id = f"test-trace-{self.root.id}"

        except Exception as error:
            print(f"Mock checkpoint write failed: {error}")

        self.version += 1

    # Patch the checkpoint writing method
    with patch.object(CheckpointManager, '_write_checkpoint', mock_write_checkpoint):
        # Create workflow
        workflow_name = f"TestWorkflow{int(time.time() * 1000)}"
        # Create proper WorkflowOpts
        workflow_opts = WorkflowOpts(metadata=metadata)
        workflow = Workflow(workflow_name, component_fn, workflow_opts)

        result = None
        error = None

        try:
            result = await workflow(props)
        except Exception as err:
            error = err

        return {
            "result": result,
            "error": error,
            "checkpoints": {cp.id: cp for cp in capture.checkpoints},
            "workflow_names": set(capture.workflow_names),
            "api_calls": capture.api_calls,
        }


def get_execution_from_api_call(api_call_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract execution data from API call data.

    Returns the raw execution node data and workflow name.
    """
    try:
        compressed_execution = base64.b64decode(api_call_data["rawExecution"])
        decompressed_execution = gzip.decompress(compressed_execution)
        execution_data = json.loads(decompressed_execution.decode("utf-8"))

        return {
            "node": execution_data,
            "workflow_name": api_call_data.get("workflowName", "test-workflow")
        }
    except Exception as error:
        print(f"Error parsing API call data: {error}")
        return {
            "node": {
                "id": f"test-id-{int(time.time() * 1000)}",
                "componentName": "TestComponent",
                "startTime": time.time() * 1000,
                "children": [],
                "props": {},
            },
            "workflow_name": "test-workflow"
        }


class MockFetch:
    """Mock fetch implementation for testing."""

    def __init__(self, handler: Callable):
        self.handler = handler
        self.calls: List[Dict[str, Any]] = []

    async def __call__(self, url: str, **kwargs) -> MockResponse:
        """Handle mock fetch call."""
        call_data = {
            "url": url,
            "method": kwargs.get("method", "GET"),
            "headers": kwargs.get("headers", {}),
            "data": kwargs.get("data"),
        }
        self.calls.append(call_data)

        return await self.handler(url, **kwargs)


def mock_fetch(handler: Callable) -> MockFetch:
    """Create a mock fetch function for testing."""
    return MockFetch(handler)
