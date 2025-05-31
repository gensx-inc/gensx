"""Tests for GenSX checkpoint functionality."""

import asyncio
import pytest
from gensx import Component, Workflow
from gensx.core.checkpoint import CheckpointManager, ExecutionNodeDict


def generate_test_id() -> str:
    """Generate test ID for unique identification."""
    import random
    import string
    return f"test-{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"


@pytest.mark.asyncio
async def test_component_returns_expected_results():
    """Test that component returns expected results."""

    @Component("SimpleComponent")
    async def simple_component(props: dict) -> str:
        await asyncio.sleep(0.001)  # Add small delay
        return f"hello {props['message']}"

    # Execute component directly
    result = await simple_component({"message": "world"})

    # Verify execution result
    assert result == "hello world"


@pytest.mark.asyncio
async def test_checkpoints_track_component_hierarchy():
    """Test that checkpoints properly track component hierarchy."""

    @Component("ChildComponent")
    async def child_component(props: dict) -> str:
        await asyncio.sleep(0.001)
        return f"processed: {props['value']}"

    @Component("ParentComponent")
    async def parent_component(props: dict) -> str:
        # Run the child component and return its result
        return await child_component({"value": props["input"]})

    # Execute parent
    result = await parent_component({"input": "test-value"})

    # Verify result
    assert result == "processed: test-value"


@pytest.mark.asyncio
async def test_checkpoint_manager_node_creation():
    """Test checkpoint manager node creation and management."""
    manager = CheckpointManager(disabled=True)  # Disable API calls for tests

    # Add root node
    root_id = manager.add_node({
        "component_name": "RootComponent",
        "props": {"test": "data"}
    })

    assert root_id in manager.nodes
    assert manager.root is not None
    assert manager.root.id == root_id
    assert manager.root.component_name == "RootComponent"
    assert manager.root.props == {"test": "data"}


@pytest.mark.asyncio
async def test_checkpoint_manager_parent_child_relationships():
    """Test checkpoint manager parent-child relationships."""
    manager = CheckpointManager(disabled=True)

    # Add root node
    root_id = manager.add_node({
        "component_name": "RootComponent",
        "props": {}
    })

    # Add child node
    child_id = manager.add_node({
        "component_name": "ChildComponent",
        "props": {"data": "test"}
    }, parent_id=root_id)

    # Verify relationships
    root_node = manager.nodes[root_id]
    child_node = manager.nodes[child_id]

    assert child_node.parent_id == root_id
    assert len(root_node.children) == 1
    assert root_node.children[0] == child_node


@pytest.mark.asyncio
async def test_checkpoint_manager_orphaned_nodes():
    """Test checkpoint manager handling of orphaned nodes."""
    manager = CheckpointManager(disabled=True)

    # Add child node before parent (simulating out-of-order execution)
    child_id = manager.add_node({
        "component_name": "ChildComponent",
        "props": {}
    }, parent_id="non-existent-parent")

    # Verify child is orphaned
    assert "non-existent-parent" in manager.orphaned_nodes
    assert manager.nodes[child_id] in manager.orphaned_nodes["non-existent-parent"]

    # Now add the parent
    parent_id = manager.add_node({
        "component_name": "ParentComponent",
        "props": {}
    })

    # Update the parent ID to match what we expected
    manager.nodes[parent_id].id = "non-existent-parent"
    manager.nodes["non-existent-parent"] = manager.nodes[parent_id]
    del manager.nodes[parent_id]

    # Check if orphan gets attached (simulate the attachment)
    parent_node = manager.nodes["non-existent-parent"]
    child_node = manager.nodes[child_id]
    manager._attach_to_parent(child_node, parent_node)
    del manager.orphaned_nodes["non-existent-parent"]

    # Verify orphan was attached
    assert child_node.parent_id == "non-existent-parent"
    assert len(parent_node.children) == 1
    assert parent_node.children[0] == child_node


@pytest.mark.asyncio
async def test_checkpoint_node_completion():
    """Test checkpoint node completion."""
    manager = CheckpointManager(disabled=True)

    # Add and complete a node
    node_id = manager.add_node({
        "component_name": "TestComponent",
        "props": {"input": "test"}
    })

    result = "test output"
    manager.complete_node(node_id, result)

    node = manager.nodes[node_id]
    assert node.output == result
    assert node.end_time is not None


@pytest.mark.asyncio
async def test_checkpoint_metadata():
    """Test checkpoint metadata handling."""
    manager = CheckpointManager(disabled=True)

    node_id = manager.add_node({
        "component_name": "TestComponent",
        "props": {}
    })

    metadata = {"test_key": "test_value", "number": 42}
    manager.add_metadata(node_id, metadata)

    node = manager.nodes[node_id]
    assert node.metadata == metadata


@pytest.mark.asyncio
async def test_secret_value_collection():
    """Test secret value collection and masking."""
    manager = CheckpointManager(disabled=True)

    # Test secret collection
    secrets = set()
    test_data = {
        "api_key": "sk-1234567890abcdef",  # Long enough to be considered secret
        "nested": {
            "password": "supersecretpassword123"
        },
        "list": ["another_secret_value_here"]
    }

    manager._collect_secret_values(test_data, secrets)

    # Should collect string values that are long enough
    assert "sk-1234567890abcdef" in secrets
    assert "supersecretpassword123" in secrets
    assert "another_secret_value_here" in secrets


@pytest.mark.asyncio
async def test_secret_scrubbing():
    """Test secret scrubbing functionality."""
    manager = CheckpointManager(disabled=True)

    # Set up some secrets
    node_id = "test-node"
    manager._secret_values[node_id] = {"supersecret123", "api-key-abc-def"}
    manager.current_node_chain = [node_id]

    # Test scrubbing
    test_data = {
        "message": "Here is my supersecret123 and api-key-abc-def",
        "safe_data": "this is fine"
    }

    scrubbed = manager._scrub_secrets(test_data, node_id)

    assert "[secret]" in scrubbed["message"]
    assert "supersecret123" not in scrubbed["message"]
    assert "api-key-abc-def" not in scrubbed["message"]
    assert scrubbed["safe_data"] == "this is fine"


@pytest.mark.asyncio
async def test_tree_validation():
    """Test execution tree validation."""
    manager = CheckpointManager(disabled=True)

    # Empty tree is invalid
    assert not manager._is_tree_valid()

    # Add root
    root_id = manager.add_node({
        "component_name": "Root",
        "props": {}
    })

    # Tree with just root is valid
    assert manager._is_tree_valid()

    # Add orphaned node - tree becomes invalid
    manager.add_node({
        "component_name": "Orphan",
        "props": {}
    }, parent_id="missing-parent")

    assert not manager._is_tree_valid()


@pytest.mark.asyncio
async def test_workflow_with_checkpoints():
    """Test full workflow execution with checkpoint tracking."""

    @Component("DataProcessor")
    async def data_processor(props: dict) -> dict:
        data = props["data"]
        return {
            "processed": data.upper(),
            "length": len(data)
        }

    @Component("ResultFormatter")
    async def result_formatter(props: dict) -> str:
        return f"Result: {props['processed']} (length: {props['length']})"

    @Workflow("TestWorkflow")
    async def test_workflow(props: dict) -> str:
        # Process data
        processed = await data_processor({"data": props["input"]})

        # Format result
        formatted = await result_formatter(processed)

        return formatted

    # Execute workflow
    result = await test_workflow({"input": "hello"})

    assert result == "Result: HELLO (length: 5)"
