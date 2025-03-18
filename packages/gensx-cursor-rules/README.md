# @gensx/cursor-rules

This package provides cursor rules for GenSX projects.

## Installation and Usage

You can install the cursor rules directly from npm without adding the package as a dependency:

```bash
# Run directly with npx to install the rules
npx @gensx/cursor-rules
```

Alternatively, you can install it as a dependency:

```bash
npm install --save-dev @gensx/cursor-rules
# or
pnpm add -D @gensx/cursor-rules
```

Then run the CLI:

```bash
npx gensx-cursor-rules
```

## What are cursor rules?

Cursor rules provide documentation and code snippets for GenSX components, which can be surfaced by IDEs and development tools that integrate with [Cursor](https://cursor.sh/).

These rules help with:

- Providing accurate code examples for GenSX components
- Showing proper parameter usage for LLM providers
- Enabling proper code completion for GenSX workflows

## Included Rules

This package includes rules for:

- `gensx.mdc` - Core GenSX concepts and syntax
- `gensx-openai.mdc` - OpenAI integration
- `gensx-anthropic.mdc` - Anthropic integration
- `gensx-mcp.mdc` - Model Control Protocol integration
- `gensx-ai-sdk.mdc` - Vercel AI SDK integration

## Custom rules

You can add your own custom rules by creating additional `.mdc` files in your project's `.cursor` directory. Your custom rules will be preserved when updating this package.

## License

Apache-2.0
