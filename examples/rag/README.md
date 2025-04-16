# Vector Search Example

This example demonstrates how to use GenSX's `useSearch` hook to create and query a vector search. It's composed of two main parts:

- `initializeBaseballSearchNamespace()`: A function that initializes a vector search namespace with a schema and inserts data into it.
- `RagWorkflow`: A workflow that uses the search functionality to answer questions about the data in the vector search namespace.

## Getting Started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up your environment variables:

   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

3. Run the application:

   ```bash
   # Ask a question about the baseball information
   pnpm start "Who plays for the Portland Pioneers?"
   ```

When you run the application, the `initializeBaseballSearchNamespace()` function will be called first to create/populate the search namespace. Then, the search functionality will be used to answer the question.
