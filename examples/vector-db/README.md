# NuLang Translator

This example demonstrates an LLM-powered translator, that uses a vector database to look up translations and translate text from English to a made up language.

## What it demonstrates

- Loading documents into a vector database:
  - Chunking the docs
  - Generating embeddings
  - Storing them in the database
- Querying the vector database for the most relevant chunks of text for a given query
- Using an LLM to translate text from English to a made up language based on the most relevant chunks of text found in the vector database
  - Giving the LLM a tool to use to look up translations for phrases

## Usage

```bash
# Install dependencies
pnpm install

# Set your OpenAI API key
export OPENAI_API_KEY=<your_api_key>

# Run the example
pnpm run start
```
