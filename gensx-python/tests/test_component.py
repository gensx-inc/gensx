"""Tests for GenSX Component functionality."""

import pytest
from gensx import Component, ComponentOpts


@pytest.mark.asyncio
async def test_basic_component():
    """Test basic component functionality."""

    @Component("TestComponent")
    async def test_component(props: dict) -> str:
        return f"Hello {props['name']}"

    result = await test_component({"name": "World"})
    assert result == "Hello World"


@pytest.mark.asyncio
async def test_component_with_sync_function():
    """Test component with synchronous function."""

    @Component("SyncComponent")
    def sync_component(props: dict) -> str:
        return f"Sync {props['value']}"

    result = await sync_component({"value": "test"})
    assert result == "Sync test"


@pytest.mark.asyncio
async def test_component_with_options():
    """Test component with options."""

    opts = ComponentOpts(
        secret_outputs=True,
        metadata={"test": "metadata"}
    )

    @Component("ComponentWithOpts", opts=opts)
    async def component_with_opts(props: dict) -> str:
        return f"Result: {props['input']}"

    result = await component_with_opts({"input": "test"})
    assert result == "Result: test"


@pytest.mark.asyncio
async def test_component_functional_style():
    """Test component created in functional style."""

    async def my_function(props: dict) -> str:
        return f"Functional {props['data']}"

    my_component = Component("FunctionalComponent", my_function)
    result = await my_component({"data": "style"})
    assert result == "Functional style"


@pytest.mark.asyncio
async def test_component_error_handling():
    """Test component error handling."""

    @Component("ErrorComponent")
    async def error_component(props: dict) -> str:
        raise ValueError("Test error")

    with pytest.raises(Exception) as exc_info:
        await error_component({"test": "data"})

    # Should wrap in ComponentError
    assert "ErrorComponent" in str(exc_info.value)


@pytest.mark.asyncio
async def test_component_with_positional_args():
    """Test component with positional arguments."""

    @Component("PositionalComponent")
    async def positional_component(name: str, age: int) -> str:
        return f"{name} is {age} years old"

    result = await positional_component("Alice", 30)
    assert result == "Alice is 30 years old"


@pytest.mark.asyncio
async def test_component_with_mixed_args():
    """Test component with mixed positional and keyword arguments."""

    @Component("MixedArgsComponent")
    async def mixed_args_component(name: str, age: int = 25) -> str:
        return f"{name} is {age} years old"

    result = await mixed_args_component("Bob", age=35)
    assert result == "Bob is 35 years old"


@pytest.mark.asyncio
async def test_nested_components():
    """Test components calling other components."""

    @Component("ChildComponent")
    async def child_component(props: dict) -> str:
        return f"Child: {props['value']}"

    @Component("ParentComponent")
    async def parent_component(props: dict) -> str:
        child_result = await child_component({"value": props["input"]})
        return f"Parent -> {child_result}"

    result = await parent_component({"input": "test"})
    assert result == "Parent -> Child: test"
