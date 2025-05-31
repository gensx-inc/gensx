"""
Example demonstrating GenSX Python SDK wrapping functionality.

This example shows how to wrap existing SDKs and classes to work with GenSX.
"""

import asyncio
from gensx import wrap, Workflow, Component


class MathSDK:
    """Example SDK for mathematical operations."""

    def __init__(self, precision: int = 2):
        self.precision = precision
        self.calculator = Calculator()

    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        result = a + b
        return round(result, self.precision)

    def multiply(self, a: float, b: float) -> float:
        """Multiply two numbers."""
        result = a * b
        return round(result, self.precision)

    async def power(self, base: float, exponent: float) -> float:
        """Calculate power (async operation)."""
        # Simulate async operation
        await asyncio.sleep(0.1)
        result = base ** exponent
        return round(result, self.precision)


class Calculator:
    """Nested calculator class."""

    def divide(self, a: float, b: float) -> float:
        """Divide two numbers."""
        if b == 0:
            raise ValueError("Cannot divide by zero")
        return a / b

    def modulo(self, a: int, b: int) -> int:
        """Calculate modulo."""
        return a % b


class StringProcessor:
    """Example SDK for string processing."""

    def uppercase(self, text: str) -> str:
        """Convert text to uppercase."""
        return text.upper()

    def reverse(self, text: str) -> str:
        """Reverse text."""
        return text[::-1]

    def word_count(self, text: str) -> int:
        """Count words in text."""
        return len(text.split())


@Workflow("MathWorkflow")
async def math_workflow(props: dict) -> dict:
    """Workflow that performs various math operations."""

    # Wrap the MathSDK
    math_sdk = MathSDK(precision=3)
    wrapped_math = wrap(math_sdk)

    a = props["a"]
    b = props["b"]

    # Use wrapped SDK methods as components
    add_result = await wrapped_math.add(a, b)
    multiply_result = await wrapped_math.multiply(a, b)
    power_result = await wrapped_math.power(a, b)

    # Use nested calculator
    divide_result = await wrapped_math.calculator.divide(a, b)

    return {
        "addition": add_result,
        "multiplication": multiply_result,
        "power": power_result,
        "division": divide_result,
        "inputs": {"a": a, "b": b}
    }


@Workflow("TextProcessingWorkflow")
async def text_processing_workflow(props: dict) -> dict:
    """Workflow that processes text using wrapped SDK."""

    # Wrap the StringProcessor SDK
    string_sdk = StringProcessor()
    wrapped_strings = wrap(string_sdk)

    text = props["text"]

    # Process text using wrapped methods
    uppercase_result = await wrapped_strings.uppercase(text)
    reverse_result = await wrapped_strings.reverse(text)
    word_count_result = await wrapped_strings.word_count(text)

    return {
        "original": text,
        "uppercase": uppercase_result,
        "reversed": reverse_result,
        "word_count": word_count_result
    }


@Component("CombinedProcessor")
async def combined_processor(props: dict) -> str:
    """Component that combines math and text processing."""

    # Run both workflows
    math_result = await math_workflow({
        "a": props["number1"],
        "b": props["number2"]
    })

    text_result = await text_processing_workflow({
        "text": props["text"]
    })

    # Format combined results
    return f"""
Combined Processing Results:
========================

Math Operations (a={math_result['inputs']['a']}, b={math_result['inputs']['b']}):
- Addition: {math_result['addition']}
- Multiplication: {math_result['multiplication']}
- Power: {math_result['power']}
- Division: {math_result['division']}

Text Processing ('{text_result['original']}'):
- Uppercase: {text_result['uppercase']}
- Reversed: {text_result['reversed']}
- Word Count: {text_result['word_count']}
"""


async def main():
    """Main function demonstrating SDK wrapping."""
    print("🔧 GenSX Python SDK Wrapping Example")
    print("=" * 50)

    # Example 1: Math SDK workflow
    print("\n1. Math SDK Workflow:")
    math_result = await math_workflow({"a": 5.5, "b": 2.3})
    print(f"Math results: {math_result}")

    # Example 2: Text processing workflow
    print("\n2. Text Processing Workflow:")
    text_result = await text_processing_workflow({"text": "Hello GenSX Python"})
    print(f"Text results: {text_result}")

    # Example 3: Combined processing
    print("\n3. Combined Processing:")
    combined_result = await combined_processor({
        "number1": 10,
        "number2": 3,
        "text": "GenSX makes SDK integration easy"
    })
    print(combined_result)

    # Example 4: Direct SDK wrapping
    print("\n4. Direct SDK Usage:")
    calculator = Calculator()
    wrapped_calc = wrap(calculator)

    division_result = await wrapped_calc.divide(15, 3)
    modulo_result = await wrapped_calc.modulo(17, 5)

    print(f"15 ÷ 3 = {division_result}")
    print(f"17 % 5 = {modulo_result}")

    print("\n✅ All SDK wrapping examples completed successfully!")


if __name__ == "__main__":
    asyncio.run(main())
