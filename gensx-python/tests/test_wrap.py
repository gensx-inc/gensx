"""Tests for GenSX wrap functionality."""

import pytest
from gensx import wrap, Component
from gensx.utils.wrap import WrapOptions


class MockSDK:
    """Mock SDK for testing wrap functionality."""

    def __init__(self, name: str):
        self.name = name
        self.client = MockClient()

    def simple_method(self, data: str) -> str:
        return f"SDK {self.name}: {data}"

    async def async_method(self, value: int) -> int:
        return value * 2


class MockClient:
    """Mock client for nested object testing."""

    def __init__(self):
        self.api = MockAPI()

    def call(self, message: str) -> str:
        return f"Client call: {message}"


class MockAPI:
    """Mock API for deeply nested object testing."""

    def request(self, endpoint: str) -> str:
        return f"API request to {endpoint}"


@pytest.mark.asyncio
async def test_basic_wrap():
    """Test basic SDK wrapping functionality."""
    sdk = MockSDK("test")
    wrapped_sdk = wrap(sdk)

    # Test that methods are converted to components
    result = await wrapped_sdk.simple_method("hello")
    assert result == "SDK test: hello"


@pytest.mark.asyncio
async def test_wrap_async_method():
    """Test wrapping async methods."""
    sdk = MockSDK("async")
    wrapped_sdk = wrap(sdk)

    result = await wrapped_sdk.async_method(5)
    assert result == 10


@pytest.mark.asyncio
async def test_wrap_nested_objects():
    """Test wrapping nested objects."""
    sdk = MockSDK("nested")
    wrapped_sdk = wrap(sdk)

    # Test nested client method
    result = await wrapped_sdk.client.call("test message")
    assert result == "Client call: test message"

    # Test deeply nested API method
    result = await wrapped_sdk.client.api.request("/users")
    assert result == "API request to /users"


@pytest.mark.asyncio
async def test_wrap_with_prefix():
    """Test wrapping with prefix option."""
    sdk = MockSDK("prefixed")
    opts = WrapOptions(prefix="MySDK")
    wrapped_sdk = wrap(sdk, opts)

    # The component should be named with the prefix
    result = await wrapped_sdk.simple_method("test")
    assert result == "SDK prefixed: test"


@pytest.mark.asyncio
async def test_wrap_preserves_attributes():
    """Test that wrapping preserves non-callable attributes."""
    sdk = MockSDK("attrs")
    wrapped_sdk = wrap(sdk)

    # Should preserve the name attribute
    assert wrapped_sdk.name == "attrs"


@pytest.mark.asyncio
async def test_wrap_with_replacement_implementations():
    """Test wrapping with replacement implementations."""

    def custom_simple_method(target, original_method):
        @Component("CustomSimpleMethod")
        async def custom_impl(data: str) -> str:
            return f"Custom: {data}"
        return custom_impl

    opts = WrapOptions(
        replacement_implementations={
            "MockSDK.simple_method": custom_simple_method
        }
    )

    sdk = MockSDK("custom")
    wrapped_sdk = wrap(sdk, opts)

    result = await wrapped_sdk.simple_method("test")
    assert result == "Custom: test"


def test_wrap_error_handling():
    """Test wrap error handling for non-existent attributes."""
    sdk = MockSDK("error")
    wrapped_sdk = wrap(sdk)

    with pytest.raises(AttributeError):
        _ = wrapped_sdk.non_existent_method


@pytest.mark.asyncio
async def test_wrap_component_naming():
    """Test that wrapped components get proper names."""
    sdk = MockSDK("naming")
    wrapped_sdk = wrap(sdk)

    # Check that the wrapped method has the expected component name
    simple_method_component = wrapped_sdk.simple_method
    assert hasattr(simple_method_component, "__gensx_component__")
    assert simple_method_component.__gensx_component__ is True


class CalculatorSDK:
    """Example SDK for more realistic testing."""

    def add(self, a: int, b: int) -> int:
        return a + b

    def multiply(self, a: int, b: int) -> int:
        return a * b

    async def divide(self, a: int, b: int) -> float:
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b


@pytest.mark.asyncio
async def test_realistic_sdk_example():
    """Test a more realistic SDK wrapping example."""
    calc = CalculatorSDK()
    wrapped_calc = wrap(calc)

    # Test basic operations
    add_result = await wrapped_calc.add(5, 3)
    assert add_result == 8

    multiply_result = await wrapped_calc.multiply(4, 6)
    assert multiply_result == 24

    divide_result = await wrapped_calc.divide(10, 2)
    assert divide_result == 5.0

    # Test error handling
    with pytest.raises(Exception):
        await wrapped_calc.divide(10, 0)
