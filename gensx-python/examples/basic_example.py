"""
Basic example demonstrating GenSX Python functionality.

This example shows how to create components and workflows using GenSX Python.
"""

import asyncio
from gensx import Component, Workflow


# Define a simple component
@Component("GreetUser")
async def greet_user(props: dict) -> str:
    """Component that greets a user."""
    name = props.get("name", "World")
    return f"Hello, {name}!"


# Define a component that processes data
@Component("ProcessData")
async def process_data(props: dict) -> dict:
    """Component that processes input data."""
    data = props["data"]
    return {
        "original": data,
        "uppercase": data.upper(),
        "length": len(data),
        "reversed": data[::-1]
    }


# Define a component that formats results
@Component("FormatResult")
async def format_result(props: dict) -> str:
    """Component that formats processed data."""
    original = props["original"]
    uppercase = props["uppercase"]
    length = props["length"]
    reversed_data = props["reversed"]

    return f"""
Data Processing Results:
- Original: {original}
- Uppercase: {uppercase}
- Length: {length}
- Reversed: {reversed_data}
"""


# Create a workflow that combines multiple components
@Workflow("DataProcessingWorkflow")
async def data_processing_workflow(props: dict) -> str:
    """Workflow that processes data through multiple components."""

    # Process the input data
    processed = await process_data({"data": props["input"]})

    # Format the results
    formatted = await format_result(processed)

    return formatted


# Create a greeting workflow
@Workflow("GreetingWorkflow")
async def greeting_workflow(props: dict) -> str:
    """Simple greeting workflow."""
    greeting = await greet_user({"name": props["name"]})
    return greeting


async def main():
    """Main function demonstrating GenSX usage."""
    print("🚀 GenSX Python Example")
    print("=" * 50)

    # Example 1: Simple greeting workflow
    print("\n1. Simple Greeting Workflow:")
    greeting_result = await greeting_workflow({"name": "GenSX Python"})
    print(greeting_result)

    # Example 2: Data processing workflow
    print("\n2. Data Processing Workflow:")
    processing_result = await data_processing_workflow({"input": "Hello GenSX"})
    print(processing_result)

    # Example 3: Using components directly
    print("\n3. Using Components Directly:")
    direct_result = await greet_user({"name": "Direct User"})
    print(direct_result)

    # Example 4: Functional style component creation
    print("\n4. Functional Style Component:")

    async def calculate_square(props: dict) -> int:
        number = props["number"]
        return number ** 2

    square_component = Component("SquareCalculator", calculate_square)
    square_result = await square_component({"number": 7})
    print(f"Square of 7 is: {square_result}")

    print("\n✅ All examples completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
