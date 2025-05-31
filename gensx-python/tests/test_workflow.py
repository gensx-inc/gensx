"""Tests for GenSX Workflow functionality."""

import pytest
from gensx import Component, Workflow, WorkflowOpts


@pytest.mark.asyncio
async def test_basic_workflow():
    """Test basic workflow functionality."""

    @Component("GreetUser")
    async def greet_user(props: dict) -> str:
        name = props.get("name", "World")
        return f"Hello, {name}!"

    @Workflow("GreetingWorkflow")
    async def greeting_workflow(props: dict) -> str:
        greeting = await greet_user({"name": props["name"]})
        return greeting

    result = await greeting_workflow({"name": "GenSX"})
    assert result == "Hello, GenSX!"


@pytest.mark.asyncio
async def test_workflow_with_run_method():
    """Test workflow using the run method."""

    @Workflow("TestWorkflow")
    async def test_workflow(props: dict) -> str:
        return f"Workflow result: {props['input']}"

    result = await test_workflow.run({"input": "test"})
    assert result == "Workflow result: test"


@pytest.mark.asyncio
async def test_workflow_with_options():
    """Test workflow with options."""

    opts = WorkflowOpts(
        print_url=False,
        metadata={"version": "1.0"}
    )

    @Workflow("WorkflowWithOpts", opts=opts)
    async def workflow_with_opts(props: dict) -> str:
        return f"Configured: {props['data']}"

    result = await workflow_with_opts({"data": "test"})
    assert result == "Configured: test"


@pytest.mark.asyncio
async def test_workflow_functional_style():
    """Test workflow created in functional style."""

    async def my_workflow_function(props: dict) -> str:
        return f"Functional workflow: {props['value']}"

    my_workflow = Workflow("FunctionalWorkflow", my_workflow_function)
    result = await my_workflow({"value": "test"})
    assert result == "Functional workflow: test"


@pytest.mark.asyncio
async def test_complex_workflow():
    """Test a more complex workflow with multiple components."""

    @Component("ProcessData")
    async def process_data(props: dict) -> dict:
        data = props["data"]
        return {"processed": data.upper(), "length": len(data)}

    @Component("FormatResult")
    async def format_result(props: dict) -> str:
        processed = props["processed"]
        length = props["length"]
        return f"Processed '{processed}' (length: {length})"

    @Workflow("ComplexWorkflow")
    async def complex_workflow(props: dict) -> str:
        # Process the data
        processed = await process_data({"data": props["input"]})

        # Format the result
        result = await format_result(processed)

        return result

    result = await complex_workflow({"input": "hello"})
    assert result == "Processed 'HELLO' (length: 5)"


@pytest.mark.asyncio
async def test_workflow_error_handling():
    """Test workflow error handling."""

    @Component("FailingComponent")
    async def failing_component(props: dict) -> str:
        raise RuntimeError("Component failed")

    @Workflow("FailingWorkflow")
    async def failing_workflow(props: dict) -> str:
        return await failing_component(props)

    with pytest.raises(Exception) as exc_info:
        await failing_workflow({"test": "data"})

    # Should wrap in WorkflowError
    assert "FailingWorkflow" in str(exc_info.value)


@pytest.mark.asyncio
async def test_workflow_with_sync_components():
    """Test workflow with synchronous components."""

    @Component("SyncComponent")
    def sync_component(props: dict) -> str:
        return f"Sync: {props['value']}"

    @Workflow("SyncWorkflow")
    async def sync_workflow(props: dict) -> str:
        result = await sync_component({"value": props["input"]})
        return f"Workflow: {result}"

    result = await sync_workflow({"input": "test"})
    assert result == "Workflow: Sync: test"
