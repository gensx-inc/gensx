# GenSX Text-to-SQL Example

This example demonstrates how to use GenSX's `useDatabase` hook to create and query a SQL database. It shows how to:

- Initialize a database with a schema
- Insert data into tables
- Build a simple agent with a query tool that can answer questions about the data in the database

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
   # Ask a question about the baseball statistics
   pnpm start "Who has the highest batting average?"
   ```
