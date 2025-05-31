"""
Checkpoint management for GenSX execution tracking.

This module provides comprehensive checkpoint functionality including:
- Execution node tracking and tree management
- Secret value detection and masking
- Orphaned node handling for out-of-order execution
- API integration with compression
- Tree validation and consistency checks
"""

import asyncio
import gzip
import json
import os
import re
import time
import uuid
from typing import Any, Dict, List, Optional, Set, Callable, Union
from urllib.parse import urljoin, urlparse
import base64
import weakref

from .types import ComponentOpts
from .exceptions import GenSXError
from .config import read_config

# Try to import aiohttp for HTTP requests, fall back to basic implementation if not available
try:
    import aiohttp
    HAS_AIOHTTP = True
except ImportError:
    HAS_AIOHTTP = False

STREAMING_PLACEHOLDER = "__GENSX_STREAMING_PLACEHOLDER__"
USER_AGENT = "gensx-python/0.1.0"


class ExecutionNodeDict:
    """Enhanced execution node with full checkpoint functionality."""

    def __init__(
        self,
        id: str,
        component_name: str,
        start_time: float,
        props: Dict[str, Any],
        parent_id: Optional[str] = None,
        component_opts: Optional[ComponentOpts] = None,
    ):
        self.id = id
        self.component_name = component_name
        self.start_time = start_time
        self.props = props
        self.parent_id = parent_id
        self.children: List["ExecutionNodeDict"] = []
        self.output: Any = None
        self.end_time: Optional[float] = None
        self.metadata: Dict[str, Any] = {}
        self.component_opts = component_opts

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "componentName": self.component_name,
            "startTime": self.start_time,
            "endTime": self.end_time,
            "props": self.props,
            "output": self.output,
            "children": [child.to_dict() for child in self.children],
            "metadata": self.metadata,
            "parentId": self.parent_id,
        }


class CheckpointWriter:
    """Protocol for checkpoint writing."""

    def add_node(
        self, node: Dict[str, Any], parent_id: Optional[str] = None
    ) -> str:
        """Add a new execution node."""
        raise NotImplementedError

    def complete_node(self, id: str, output: Any) -> None:
        """Mark node as completed with output."""
        raise NotImplementedError

    def add_metadata(self, id: str, metadata: Dict[str, Any]) -> None:
        """Add metadata to a node."""
        raise NotImplementedError

    def update_node(self, id: str, updates: Dict[str, Any]) -> None:
        """Update node with new data."""
        raise NotImplementedError

    def write(self) -> None:
        """Write checkpoint to storage."""
        raise NotImplementedError

    async def wait_for_pending_updates(self) -> None:
        """Wait for pending checkpoint updates."""
        raise NotImplementedError


class CheckpointManager(CheckpointWriter):
    """
    Comprehensive checkpoint manager that tracks execution tree and handles
    out-of-order node creation, secret masking, and API persistence.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        org: Optional[str] = None,
        disabled: Optional[bool] = None,
        api_base_url: Optional[str] = None,
        console_base_url: Optional[str] = None,
        execution_run_id: Optional[str] = None,
        runtime: Optional[str] = None,
        runtime_version: Optional[str] = None,
    ):
        # Priority order: constructor opts > env vars > config file > defaults
        config = read_config()

        self.api_key = (
            api_key
            or os.environ.get("GENSX_API_KEY")
            or config.api_token
        )
        self.org = (
            org
            or os.environ.get("GENSX_ORG")
            or config.api_org
        )
        self.api_base_url = (
            api_base_url
            or os.environ.get("GENSX_API_BASE_URL")
            or config.api_base_url
            or "https://api.gensx.com"
        )
        self.console_base_url = (
            console_base_url
            or os.environ.get("GENSX_CONSOLE_URL")
            or config.console_base_url
            or "https://app.gensx.com"
        )

        # Check if checkpoints are disabled - mimic TypeScript behavior exactly
        # checkpointsEnabled = apiKey !== undefined
        self.checkpoints_enabled = self.api_key is not None

        # Additional disable checks
        if (
            disabled
            or os.environ.get("GENSX_CHECKPOINTS") in ("false", "0", "no", "off")
        ):
            self.checkpoints_enabled = False

        if self.checkpoints_enabled and not self.org:
            raise GenSXError(
                "Organization not set. Set it via constructor options, "
                "GENSX_ORG environment variable, or in ~/.config/gensx/config. "
                "You can disable checkpoints by setting GENSX_CHECKPOINTS=false "
                "or unsetting GENSX_API_KEY."
            )

        # Runtime configuration
        self.runtime = runtime or os.environ.get("GENSX_RUNTIME")
        if self.runtime and self.runtime not in ("cloud", "sdk"):
            raise GenSXError('Invalid runtime. Must be either "cloud" or "sdk"')

        self.runtime_version = runtime_version or os.environ.get("GENSX_RUNTIME_VERSION")
        self.execution_run_id = execution_run_id or os.environ.get("GENSX_EXECUTION_RUN_ID")

        # State management
        self.nodes: Dict[str, ExecutionNodeDict] = {}
        self.orphaned_nodes: Dict[str, Set[ExecutionNodeDict]] = {}
        self._secret_values: Dict[str, Set[Any]] = {}  # Per-node secrets
        self.current_node_chain: List[str] = []  # Track current execution context
        self.root: Optional[ExecutionNodeDict] = None

        # Checkpoint writing state
        self.active_checkpoint: Optional[asyncio.Task] = None
        self.pending_update = False
        self.version = 1
        self.workflow_name: Optional[str] = None
        self.print_url = False
        self.have_printed_url = False

        # API state
        self.trace_id: Optional[str] = None

        # Constants
        self.MIN_SECRET_LENGTH = 8

        # Debug output - show configuration
        if not self.checkpoints_enabled:
            if not self.api_key:
                print("[Checkpoint] Checkpoints disabled: No API key provided. Set GENSX_API_KEY environment variable or configure ~/.config/gensx/config to enable.")
            else:
                print("[Checkpoint] Checkpoints disabled via configuration.")
        else:
            print(f"[Checkpoint] Checkpoints enabled. Org: {self.org}, API: {self.api_base_url}")

    @property
    def secret_values(self) -> Set[Any]:
        """Get unified view of all secrets across all nodes."""
        all_secrets = set()
        for secrets in self._secret_values.values():
            all_secrets.update(secrets)
        return all_secrets

    def generate_uuid(self) -> str:
        """Generate a UUID for node identification."""
        return str(uuid.uuid4())

    def _attach_to_parent(self, node: ExecutionNodeDict, parent: ExecutionNodeDict) -> None:
        """Attach a node to its parent in the execution tree."""
        node.parent_id = parent.id
        if not any(child.id == node.id for child in parent.children):
            parent.children.append(node)

    def _handle_orphaned_node(self, node: ExecutionNodeDict, expected_parent_id: str) -> None:
        """Handle a node whose parent doesn't exist yet."""
        if expected_parent_id not in self.orphaned_nodes:
            self.orphaned_nodes[expected_parent_id] = set()
        self.orphaned_nodes[expected_parent_id].add(node)

        # Add diagnostic timeout to detect stuck orphans
        self._check_orphan_timeout(node.id, expected_parent_id)

    def _check_orphan_timeout(self, node_id: str, expected_parent_id: str) -> None:
        """Check for orphaned nodes that are stuck waiting for parents."""
        async def check_timeout():
            await asyncio.sleep(5.0)  # 5 second timeout
            orphans = self.orphaned_nodes.get(expected_parent_id)
            node = self.nodes.get(node_id)
            if orphans and node and node in orphans:
                print(f"[Checkpoint] Node {node_id} ({node.component_name}) "
                      f"still waiting for parent {expected_parent_id} after 5s")

        # Schedule the timeout check
        asyncio.create_task(check_timeout())

    def _is_tree_valid(self) -> bool:
        """
        Validate that the execution tree is complete:
        1. Root node exists
        2. No orphaned nodes waiting for parents
        3. All parent-child relationships are properly connected
        """
        if not self.root:
            return False

        if self.orphaned_nodes:
            return False

        def verify_node(node: ExecutionNodeDict) -> bool:
            for child in node.children:
                if child.parent_id != node.id:
                    return False
                if not verify_node(child):
                    return False
            return True

        return verify_node(self.root)

    def _is_native_function(self, value: Any) -> bool:
        """Check if value is a native function."""
        return (
            callable(value)
            and hasattr(value, "__name__")
            and "[native code]" in str(value)
        )

    def _clone_value(self, value: Any, visited: Optional[Set[int]] = None) -> Any:
        """
        Clone a value for safe storage, handling circular references
        and special object types.
        """
        if visited is None:
            visited = set()

        # Handle None/primitives
        if value is None or isinstance(value, (str, int, float, bool)):
            return value

        # Prevent infinite recursion
        value_id = id(value)
        if value_id in visited:
            return "[circular reference]"
        visited.add(value_id)

        try:
            # Handle functions
            if callable(value):
                if self._is_native_function(value):
                    return "[native function]"
                return "[function]"

            # Handle lists
            if isinstance(value, list):
                return [self._clone_value(item, visited) for item in value]

            # Handle dicts
            if isinstance(value, dict):
                return {
                    key: self._clone_value(val, visited)
                    for key, val in value.items()
                }

            # Handle objects with toJSON method
            if hasattr(value, "to_json") and callable(value.to_json):
                return self._clone_value(value.to_json(), visited)

            # Handle other objects by trying to serialize their __dict__
            if hasattr(value, "__dict__"):
                return {
                    key: self._clone_value(val, visited)
                    for key, val in value.__dict__.items()
                    if not key.startswith("_")
                }

            # Fallback to string representation
            return str(value)

        except Exception:
            return "[unserializable]"
        finally:
            visited.discard(value_id)

    def _with_node(self, node_id: str, fn: Callable[[], Any]) -> Any:
        """Execute function with current node context."""
        self.current_node_chain.append(node_id)
        try:
            return fn()
        finally:
            self.current_node_chain.pop()

    def _get_effective_secrets(self) -> Set[Any]:
        """Get secrets from current node and all ancestors."""
        all_secrets = set()
        for node_id in self.current_node_chain:
            node_secrets = self._secret_values.get(node_id, set())
            all_secrets.update(node_secrets)
        return all_secrets

    def _register_secrets(
        self, props: Dict[str, Any], paths: List[str], node_id: str
    ) -> None:
        """Register secrets from component props for masking."""
        def register_with_node():
            node_secrets = self._secret_values.setdefault(node_id, set())

            for path in paths:
                value = self._get_value_at_path(props, path)
                if value is not None:
                    self._collect_secret_values(value, node_secrets)

        self._with_node(node_id, register_with_node)

    def _collect_secret_values(
        self, data: Any, node_secrets: Set[Any], visited: Optional[Set[int]] = None
    ) -> None:
        """Recursively collect secret values from data structure."""
        if visited is None:
            visited = set()

        # Prevent infinite recursion
        if data and isinstance(data, (dict, list)):
            data_id = id(data)
            if data_id in visited:
                return
            visited.add(data_id)

        try:
            # Handle strings
            if isinstance(data, str) and len(data) >= self.MIN_SECRET_LENGTH:
                node_secrets.add(data)
                return

            # Skip other primitives
            if not isinstance(data, (dict, list)):
                return

            # Handle lists
            if isinstance(data, list):
                for item in data:
                    self._collect_secret_values(item, node_secrets, visited)

            # Handle dicts
            elif isinstance(data, dict):
                for value in data.values():
                    self._collect_secret_values(value, node_secrets, visited)

        finally:
            if data and isinstance(data, (dict, list)):
                visited.discard(id(data))

    def _get_value_at_path(self, obj: Dict[str, Any], path: str) -> Any:
        """Get value at dot-separated path in object."""
        current = obj
        for key in path.split("."):
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current

    def _scrub_secrets(self, data: Any, node_id: Optional[str] = None) -> Any:
        """Scrub secrets from data structure."""
        def scrub_with_node():
            return self._scrub_data(data)

        if node_id:
            return self._with_node(node_id, scrub_with_node)
        else:
            return self._scrub_data(data)

    def _scrub_data(self, data: Any, visited: Optional[Set[int]] = None) -> Any:
        """Internal method to scrub secrets from data."""
        if visited is None:
            visited = set()

        # Handle native functions
        if self._is_native_function(data):
            return "[native function]"

        # Handle functions
        if callable(data):
            return "[function]"

        # Handle strings and numbers
        if isinstance(data, (str, int, float)):
            return self._scrub_string(str(data))

        # Skip other primitives
        if data is None or isinstance(data, bool):
            return data

        # Prevent infinite recursion
        if isinstance(data, (dict, list)):
            data_id = id(data)
            if data_id in visited:
                return "[circular reference]"
            visited.add(data_id)

        try:
            # Handle lists
            if isinstance(data, list):
                return [self._scrub_data(item, visited) for item in data]

            # Handle dicts
            if isinstance(data, dict):
                return {
                    key: self._scrub_data(value, visited)
                    for key, value in data.items()
                }

            # Other objects
            return data

        finally:
            if isinstance(data, (dict, list)):
                visited.discard(id(data))

    def _scrub_string(self, value: str) -> str:
        """Scrub secrets from string value."""
        effective_secrets = self._get_effective_secrets()
        result = value

        # Sort secrets by length (longest first) to handle overlapping secrets
        secrets = [
            s for s in effective_secrets
            if isinstance(s, str) and len(s) >= self.MIN_SECRET_LENGTH
        ]
        secrets.sort(key=len, reverse=True)

        # Replace each secret with [secret]
        for secret in secrets:
            if secret in result:
                # Escape special regex characters
                escaped_secret = re.escape(secret)
                result = re.sub(escaped_secret, "[secret]", result)

        return result

    def _mask_execution_tree(self, node: ExecutionNodeDict) -> Dict[str, Any]:
        """Mask secrets in execution tree for safe serialization."""
        node_dict = node.to_dict()

        # Mask props
        node_dict["props"] = self._scrub_secrets(node_dict["props"], node.id)

        # Mask output if present
        if node_dict["output"] is not None:
            node_dict["output"] = self._scrub_secrets(node_dict["output"], node.id)

        # Mask metadata if present
        if node_dict["metadata"]:
            node_dict["metadata"] = self._scrub_secrets(node_dict["metadata"], node.id)

        # Recursively mask children
        node_dict["children"] = [
            self._mask_execution_tree(child) for child in node.children
        ]

        return node_dict

    def _count_steps(self, node: ExecutionNodeDict) -> int:
        """Count total steps in execution tree."""
        return 1 + sum(self._count_steps(child) for child in node.children)

    async def _write_checkpoint(self) -> None:
        """Write checkpoint to API with compression."""
        if not self.root:
            return

        try:
            # Create masked copy of execution tree
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
                "rawExecution": base64_compressed_execution,
                "steps": steps,
            }

            # Add optional fields only if they have values
            if self.root.end_time is not None:
                payload["completedAt"] = int(self.root.end_time * 1000)
            if self.runtime is not None:
                payload["runtime"] = self.runtime
            if self.runtime_version is not None:
                payload["runtimeVersion"] = self.runtime_version
            if self.execution_run_id is not None:
                payload["executionRunId"] = self.execution_run_id

            # Compress payload
            compressed_data = gzip.compress(json.dumps(payload).encode("utf-8"))

            # Choose endpoint based on whether we have a trace ID
            if not self.trace_id:
                url = f"{self.api_base_url}/org/{self.org}/traces"
                method = "POST"
            else:
                url = f"{self.api_base_url}/org/{self.org}/traces/{self.trace_id}"
                method = "PUT"

            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "Content-Encoding": "gzip",
                "Authorization": f"Bearer {self.api_key}",
                "Accept-Encoding": "gzip",
                "User-Agent": USER_AGENT,
            }

            print(f"[Checkpoint] Writing checkpoint to {method} {url}")

            # Make API request
            if HAS_AIOHTTP:
                await self._write_checkpoint_aiohttp(method, url, headers, compressed_data)
            else:
                # Fall back to basic implementation without actual HTTP
                print("[Checkpoint] Warning: aiohttp not available. Install with: pip install aiohttp")
                print(f"[Checkpoint] Would {method} to {url} with {len(compressed_data)} bytes")
                # Simulate successful response
                self.trace_id = self.trace_id or str(uuid.uuid4())

        except Exception as error:
            print(f"[Checkpoint] Failed to save checkpoint: {error}")

        # Always increment version
        self.version += 1

    async def _write_checkpoint_aiohttp(self, method: str, url: str, headers: Dict[str, str], data: bytes) -> None:
        """Write checkpoint using aiohttp."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.request(method, url, headers=headers, data=data) as response:
                    if not response.ok:
                        error_text = await response.text()
                        print(f"[Checkpoint] Failed to save checkpoint, server error: {response.status} - {error_text}")
                        return

                    try:
                        response_data = await response.json()

                        # Extract data from nested response structure
                        data = response_data.get("data", response_data)

                        # Check for different possible trace ID field names
                        trace_id = (data.get("traceId") or
                                   data.get("trace_id") or
                                   data.get("id"))

                        if trace_id:
                            self.trace_id = trace_id

                        print(f"[Checkpoint] Successfully saved checkpoint. Trace ID: {self.trace_id}")

                        # Print URL if requested
                        if (self.print_url and not self.have_printed_url and
                            response.ok and "executionId" in data and
                            "workflowName" in data):
                            execution_url = (
                                f"{self.console_base_url}/{self.org}/default/executions/"
                                f"{data['executionId']}?workflowName={data['workflowName']}"
                            )
                            self.have_printed_url = True
                            print(f"\n\n\033[33m[GenSX] View execution at:\033[0m \033[1;34m{execution_url}\033[0m\n\n")

                    except Exception as json_error:
                        print(f"[Checkpoint] Error parsing response JSON: {json_error}")
                        # Still consider the checkpoint successful if we got a 2xx response
                        print(f"[Checkpoint] Checkpoint sent successfully (status {response.status})")

        except Exception as error:
            print(f"[Checkpoint] HTTP request failed: {error}")

    def _update_checkpoint(self) -> None:
        """Update checkpoint in a non-blocking manner."""
        if not self.checkpoints_enabled:
            return

        # Only write if we have a valid tree
        if not self._is_tree_valid():
            self.pending_update = True
            return

        # If there's already a pending update, just mark that we need another update
        if self.active_checkpoint and not self.active_checkpoint.done():
            self.pending_update = True
            return

        # Start a new checkpoint write
        async def write_and_handle_pending():
            try:
                await self._write_checkpoint()
            except asyncio.CancelledError:
                # Handle cancellation gracefully
                pass
            except Exception as e:
                print(f"[Checkpoint] Error in checkpoint write: {e}")
            finally:
                self.active_checkpoint = None
                # If there was a pending update requested while we were writing,
                # trigger another write
                if self.pending_update:
                    self.pending_update = False
                    self._update_checkpoint()

        self.active_checkpoint = asyncio.create_task(write_and_handle_pending())

    def add_node(
        self, partial_node: Dict[str, Any], parent_id: Optional[str] = None
    ) -> str:
        """Add a new execution node to the tree."""
        node_id = self.generate_uuid()
        cloned_partial = self._clone_value(partial_node)

        # Create the node
        node = ExecutionNodeDict(
            id=node_id,
            component_name=cloned_partial.get("component_name", "Unknown"),
            start_time=time.time(),
            props=cloned_partial.get("props", {}),
            parent_id=parent_id,
            component_opts=cloned_partial.get("component_opts"),
        )

        # Register secrets if component opts specify them
        if node.component_opts and hasattr(node.component_opts, 'secret_props'):
            if node.component_opts.secret_props:
                self._register_secrets(node.props, node.component_opts.secret_props, node_id)

        # Store the node
        self.nodes[node_id] = node

        if parent_id:
            parent = self.nodes.get(parent_id)
            if parent:
                # Normal case - parent exists
                self._attach_to_parent(node, parent)
            else:
                # Parent doesn't exist yet - track as orphaned
                node.parent_id = parent_id
                self._handle_orphaned_node(node, parent_id)
        else:
            # Handle root node case
            if not self.root:
                self.root = node
            elif self.root.parent_id == node_id:
                # Current root was waiting for this node as parent
                self._attach_to_parent(self.root, node)
                self.root = node
            else:
                # Multiple root nodes - this matches TypeScript behavior exactly
                # Just warn but DON'T replace the root (this is expected for standalone components)
                pass  # Don't change self.root or warn - this is normal for standalone component usage

        # Check if this node is a parent any orphans are waiting for
        waiting_children = self.orphaned_nodes.get(node_id)
        if waiting_children:
            # Attach all waiting children
            for orphan in list(waiting_children):
                self._attach_to_parent(orphan, node)
            # Clear the orphans list for this parent
            del self.orphaned_nodes[node_id]

        # Only trigger checkpoint write for root nodes (like TypeScript does)
        # Child nodes will be included when their parent completes
        if not parent_id and self.root == node:
            self._update_checkpoint()

        return node_id

    def complete_node(self, id: str, output: Any) -> None:
        """Mark node as completed with output."""
        node = self.nodes.get(id)
        if node:
            node.end_time = time.time()
            node.output = self._clone_value(output)

            # Register output secrets if configured
            if (node.component_opts and
                hasattr(node.component_opts, 'secret_outputs') and
                node.component_opts.secret_outputs and
                output != STREAMING_PLACEHOLDER):

                def register_output_secrets():
                    node_secrets = self._secret_values.setdefault(id, set())
                    self._collect_secret_values(output, node_secrets)

                self._with_node(id, register_output_secrets)

            self._update_checkpoint()
        else:
            print(f"[Checkpoint] Attempted to complete unknown node: {id}")

    def add_metadata(self, id: str, metadata: Dict[str, Any]) -> None:
        """Add metadata to a node."""
        node = self.nodes.get(id)
        if node:
            node.metadata.update(metadata)
            self._update_checkpoint()

    def update_node(self, id: str, updates: Dict[str, Any]) -> None:
        """Update node with new data."""
        node = self.nodes.get(id)
        if node:
            # Handle output secrets if updating output
            if ("output" in updates and
                node.component_opts and
                hasattr(node.component_opts, 'secret_outputs') and
                node.component_opts.secret_outputs and
                updates["output"] != STREAMING_PLACEHOLDER):

                def register_update_secrets():
                    node_secrets = self._secret_values.setdefault(id, set())
                    self._collect_secret_values(updates["output"], node_secrets)

                self._with_node(id, register_update_secrets)

            # Update node attributes
            for key, value in updates.items():
                if hasattr(node, key):
                    setattr(node, key, self._clone_value(value))

            self._update_checkpoint()
        else:
            print(f"[Checkpoint] Attempted to update unknown node: {id}")

    def set_workflow_name(self, name: str) -> None:
        """Set the workflow name."""
        self.workflow_name = name

    def set_print_url(self, print_url: bool) -> None:
        """Set whether to print execution URLs."""
        self.print_url = print_url

    def write(self) -> None:
        """Trigger checkpoint write."""
        self._update_checkpoint()

    async def wait_for_pending_updates(self) -> None:
        """Wait for any pending checkpoint updates."""
        # Wait for active checkpoint
        if self.active_checkpoint and not self.active_checkpoint.done():
            try:
                await self.active_checkpoint
            except Exception as e:
                print(f"[Checkpoint] Error waiting for checkpoint: {e}")

        # If that checkpoint triggered another update, wait again
        if self.pending_update or (self.active_checkpoint and not self.active_checkpoint.done()):
            await self.wait_for_pending_updates()

    async def cleanup(self) -> None:
        """Clean up any pending async operations."""
        try:
            # First, try to wait for pending updates with a timeout
            if self.active_checkpoint and not self.active_checkpoint.done():
                try:
                    await asyncio.wait_for(self.active_checkpoint, timeout=5.0)
                except asyncio.TimeoutError:
                    print("[Checkpoint] Timeout waiting for checkpoint completion")
                except Exception as e:
                    print(f"[Checkpoint] Error waiting for checkpoint: {e}")
        except Exception as e:
            print(f"[Checkpoint] Error during cleanup: {e}")

        # Cancel any remaining tasks
        if self.active_checkpoint and not self.active_checkpoint.done():
            self.active_checkpoint.cancel()
            try:
                await self.active_checkpoint
            except asyncio.CancelledError:
                pass
            except Exception as e:
                print(f"[Checkpoint] Error cancelling checkpoint task: {e}")

    def __del__(self):
        """Destructor to clean up any pending tasks."""
        if hasattr(self, 'active_checkpoint') and self.active_checkpoint and not self.active_checkpoint.done():
            # Can't await in __del__, so just cancel
            self.active_checkpoint.cancel()
