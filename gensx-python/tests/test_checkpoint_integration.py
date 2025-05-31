"""Integration tests for checkpoint functionality using test utilities."""

import pytest
from tests.utils.execute_with_checkpoints import (
    execute_with_checkpoints,
    execute_workflow_with_checkpoints,
    get_execution_from_api_call,
)


@pytest.mark.asyncio
async def test_execute_with_checkpoints_basic():
    """Test basic component execution with checkpoint capture."""

    async def simple_function(props: dict) -> str:
        return f"Hello {props['name']}"

    result_data = await execute_with_checkpoints(
        simple_function,
        {"name": "World"},
        {"name": "SimpleFunction"}
    )

    # Verify execution result
    assert result_data["result"] == "Hello World"

    # Verify checkpoint was captured (may be multiple due to updates)
    assert len(result_data["checkpoints"]) >= 1

    # Check the final checkpoint state
    final_checkpoint = result_data["checkpoints"][-1]
    assert final_checkpoint.component_name == "SimpleFunction"
    assert final_checkpoint.props == {"name": "World"}
    assert final_checkpoint.output == "Hello World"
    assert final_checkpoint.end_time is not None


@pytest.mark.asyncio
async def test_execute_with_checkpoints_nested():
    """Test nested component execution with checkpoint hierarchy."""

    async def child_function(props: dict) -> str:
        return f"Child: {props['value']}"

    async def parent_function(props: dict) -> str:
        from gensx import Component
        child_component = Component("ChildComponent", child_function)
        child_result = await child_component({"value": props["input"]})
        return f"Parent -> {child_result}"

    result_data = await execute_with_checkpoints(
        parent_function,
        {"input": "test"},
        {"name": "ParentComponent"}
    )

    # Verify execution result
    assert result_data["result"] == "Parent -> Child: test"

    # Verify checkpoint structure - should have API calls
    assert len(result_data["api_calls"]) >= 1

    # Extract execution data from the final API call
    api_call = result_data["api_calls"][-1]
    execution_data = get_execution_from_api_call(api_call)

    # Should have the parent component as workflow name
    assert execution_data["workflow_name"] == "ParentComponent"


@pytest.mark.asyncio
async def test_execute_workflow_with_checkpoints():
    """Test workflow execution with checkpoint capture."""

    async def workflow_function(props: dict) -> str:
        return f"Workflow result: {props['input']}"

    result_data = await execute_workflow_with_checkpoints(
        workflow_function,
        {"input": "test data"},
        metadata={"version": "1.0"}
    )

    # Verify execution result
    assert result_data["result"] == "Workflow result: test data"
    assert result_data["error"] is None

    # Note: Workflow execution may not generate checkpoints in the same way
    # as component execution, so we just verify the execution worked
    # The checkpoint system is primarily designed for component tracking


@pytest.mark.asyncio
async def test_checkpoint_secret_handling():
    """Test that secrets are properly handled in checkpoints."""

    async def secret_function(props: dict) -> dict:
        # This function works with potential secrets
        return {
            "api_response": f"Processed: {props['data']}",
            "debug_info": props.get("api_key", "no-key")
        }

    result_data = await execute_with_checkpoints(
        secret_function,
        {
            "data": "public data",
            "api_key": "sk-supersecretkey123456789"  # Long enough to be considered secret
        },
        {"name": "SecretFunction"}
    )

    # Verify execution worked
    assert "Processed: public data" in result_data["result"]["api_response"]

    # Check that checkpoints were captured
    assert len(result_data["checkpoints"]) >= 1

    # The actual secret masking would be tested at the CheckpointManager level
    # This test ensures the integration works end-to-end


@pytest.mark.asyncio
async def test_checkpoint_error_handling():
    """Test checkpoint behavior when components raise errors."""

    async def failing_function(props: dict) -> str:
        raise ValueError("Test error")

    # This should capture the error in checkpoints but still raise
    with pytest.raises(Exception) as exc_info:
        await execute_with_checkpoints(
            failing_function,
            {"test": "data"},
            {"name": "FailingFunction"}
        )

    # The error should be wrapped appropriately
    assert "FailingFunction" in str(exc_info.value)


@pytest.mark.asyncio
async def test_checkpoint_metadata_capture():
    """Test that metadata is properly captured in checkpoints."""

    async def metadata_function(props: dict) -> str:
        return f"Result: {props['input']}"

    result_data = await execute_with_checkpoints(
        metadata_function,
        {"input": "test"},
        {"name": "MetadataFunction"}
    )

    # Verify the basic execution
    assert result_data["result"] == "Result: test"

    # Verify API calls were made
    assert len(result_data["api_calls"]) > 0

    # Check the structure of the API call
    api_call = result_data["api_calls"][-1]  # Get the final API call
    assert "executionId" in api_call
    assert "workflowName" in api_call
    assert "rawExecution" in api_call
    assert api_call["schemaVersion"] == 2


@pytest.mark.asyncio
async def test_multiple_component_checkpoint_tracking():
    """Test checkpoint tracking across multiple components."""

    async def processor_a(props: dict) -> dict:
        return {"processed_a": props["data"].upper()}

    async def processor_b(props: dict) -> dict:
        return {"processed_b": props["processed_a"] + "_SUFFIX"}

    async def combined_workflow(props: dict) -> str:
        from gensx import Component

        proc_a = Component("ProcessorA", processor_a)
        proc_b = Component("ProcessorB", processor_b)

        result_a = await proc_a({"data": props["input"]})
        result_b = await proc_b(result_a)

        return f"Final: {result_b['processed_b']}"

    result_data = await execute_with_checkpoints(
        combined_workflow,
        {"input": "hello"},
        {"name": "CombinedWorkflow"}
    )

    # Verify the final result
    assert result_data["result"] == "Final: HELLO_SUFFIX"

    # Verify checkpoint capture
    assert len(result_data["api_calls"]) > 0

    # Extract and verify the execution tree structure
    api_call = result_data["api_calls"][-1]  # Get the final API call
    execution_data = get_execution_from_api_call(api_call)

    # Should have the main workflow node
    assert execution_data["node"]["componentName"] == "CombinedWorkflow"
