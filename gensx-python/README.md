# GenSX Python

Build AI workflows using Python components.

GenSX Python is a port of the popular [GenSX TypeScript framework](https://gensx.com) that allows you to create LLM workflows and AI agents using a component-based approach in Python.

## Installation

```bash
pip install gensx
```

## Quick Start

```python
import asyncio
from gensx import Component, Workflow

# Define a component
@Component("GreetUser")
async def greet_user(props: dict) -> str:
    name = props.get("name", "World")
    return f"Hello, {name}!"

# Create a workflow
@Workflow("GreetingWorkflow")
async def greeting_workflow(props: dict) -> str:
    greeting = await greet_user({"name": props["name"]})
    return greeting

# Run the workflow
async def main():
    result = await greeting_workflow.run({"name": "GenSX"})
    print(result)  # Output: Hello, GenSX!

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Features

- **Component-Based**: Build workflows from reusable, composable components
- **Async by Default**: Native support for async/await and concurrent execution
- **Type Safe**: Full type hints and runtime validation with Pydantic
- **Streaming Support**: Handle streaming responses from LLMs naturally
- **SDK Wrapping**: Automatically convert any Python SDK into GenSX components
- **Execution Tracking**: Built-in checkpointing for debugging and replay

## Documentation

For full documentation, examples, and API reference, visit [gensx.com/docs](https://gensx.com/docs).

## Development Status

This is an alpha release. The API is still evolving and may change in future versions.

## License

Apache 2.0 - see [LICENSE](LICENSE) for details.
