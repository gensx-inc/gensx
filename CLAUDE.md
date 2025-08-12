# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

GenSX is a **TypeScript monorepo** for building complex LLM applications using a component-based approach. The repository contains:

- **`/packages/`** - Core framework packages published to npm
- **`/examples/`** - Example applications demonstrating framework capabilities
- **`/website/`** - Documentation and marketing website
- **`/extensions/`** - Browser extensions and integrations

## Key Commands

### Development and Building

```bash
# Development (watch and build packages)
pnpm dev

# Build all packages
pnpm build

# Build specific targets
pnpm build:examples    # Build examples only
pnpm build:home        # Build homepage
pnpm build:docs        # Build documentation

# Clean build artifacts
pnpm clean
```

### Testing and Quality

```bash
# Run tests for all packages
pnpm test

# Run tests for examples only
pnpm test:examples

# Run specific test by name
pnpm test -- -t "test name"

# Run type checking tests
pnpm test:types

# Linting and formatting
pnpm lint              # Run linter on packages
pnpm lint:fix          # Fix linting issues (ALWAYS run after code changes)
pnpm format            # Format code with prettier
pnpm format:check      # Check formatting
```

### Package Management

```bash
# Install dependencies
pnpm install

# Add dependency to specific package
pnpm add <package> --filter <workspace>

# Run command in specific workspace
pnpm --filter <workspace> <command>
```

## Architecture Overview

### Core Package Structure

**Framework Packages:**

- **`@gensx/core`** - Core component system and workflow execution engine
- **`gensx`** - Main CLI tool with development server and deployment capabilities
- **`@gensx/openai`** - OpenAI integration components
- **`@gensx/anthropic`** - Anthropic integration components
- **`@gensx/storage`** - Built-in storage (blob, database, vector search)
- **`@gensx/vercel-ai`** - Vercel AI SDK integration
- **`@gensx/react`** - React hooks and utilities
- **`create-gensx`** - Project scaffolding tool

**AI Development Tools:**

- **`@gensx/cursor-rules`** - Cursor editor rules for GenSX components
- **`@gensx/windsurf-rules`** - Windsurf editor integration
- **`@gensx/cline-rules`** - Cline AI assistant integration

### Build System Architecture

**Monorepo Management:**

- **pnpm workspaces** with catalog system for dependency version management
- **Turbo** for build orchestration and caching
- **Rollup** for library bundling (generates both ESM and CJS outputs)
- Build dependencies: packages depend on `^build` (dependencies must build first)

**Key Configuration Files:**

- `turbo.json` - Build orchestration and task dependencies
- `pnpm-workspace.yaml` - Workspace configuration
- `eslint.config.mjs` - Strict TypeScript and JavaScript linting
- `vitest.workspace.ts` - Testing configuration across packages

## Development Patterns

### GenSX Component Pattern

```typescript
const MyComponent = gensx.Component(
  "ComponentName",
  async (input: InputType): Promise<OutputType> => {
    // Component logic here
    return output;
  },
);
```

### GenSX Workflow Pattern

```typescript
const MyWorkflow = gensx.Workflow("WorkflowName", async (input) => {
  const step1 = await Component1(input);
  const step2 = await Component2(step1);
  return step2;
});
```

### JSX Component Pattern

```typescript
// Uses JSX with @gensx/core as jsxImportSource
const MyJSXComponent = gensx.Component(
  "MyJSXComponent",
  async ({ children, ...props }) => {
    return (
      <SomeProvider>
        {children}
      </SomeProvider>
    );
  }
);
```

## Code Style Guidelines

### TypeScript Standards

- Use **strict TypeScript** - no `any` types allowed
- Prefer async/await over promise chains
- Use proper JSDoc comments for exported functions/types
- Naming conventions:
  - Components: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Types/Interfaces: PascalCase

### Import Organization

- Uses `simple-import-sort` ESLint plugin
- Order: Node.js built-ins → external packages → relative imports
- Always use explicit imports, avoid default imports where possible

### JSX Standards

- All components should use JSX syntax with `@gensx/core` as jsxImportSource
- Configured in TypeScript: `"jsx": "react-jsx"`, `"jsxImportSource": "@gensx/core"`

### Error Handling

- Always use try/catch for async operations
- Use specific error types, not generic Error
- Proper error logging with structured context

## Testing Guidelines

### Testing Framework: Vitest

- Uses **Vitest** across all packages with **Istanbul** coverage
- Tests located in `/tests/` directory for each package
- Test files follow pattern `*.test.ts` or `*.test.tsx`

### Testing Patterns

```typescript
// Component testing
import { gensx } from "@gensx/core";

suite("MyComponent", () => {
  test("should handle basic input", async () => {
    const result = await MyComponent({ input: "test" });
    expect(result).toBe("expected");
  });
});
```

### Test Philosophy

- **Test real behavior**, minimize mocking of internal code
- Only mock external third-party services (APIs, etc.)
- Each test should be isolated and repeatable
- Use environment variables for API keys: `OPENAI_API_KEY`, etc.

### Running Tests

```bash
# All tests
pnpm test

# Specific package tests
cd packages/gensx-core && pnpm test

# Tests with specific pattern
pnpm test -- -t "component name"

# With coverage
pnpm test --coverage
```

## Build System Details

### Turbo Configuration

- Parallel builds with dependency caching
- Tasks: `build`, `test`, `lint`, `type-check`
- Build dependencies ensure packages build in correct order
- Incremental builds based on file changes

### Package Dependencies

```bash
# Core packages have minimal external dependencies
# Examples depend on core packages
# CLI tools depend on core packages
# Shared build tooling across all packages
```

### Important Build Notes

- **Always run `pnpm lint:fix` after code changes**
- Dependencies managed through pnpm catalog for version consistency
- Build artifacts in `dist/` directories (gitignored)

## Development Environment

### VSCode Configuration

The repository includes `.vscode/settings.json` with:

- Auto-format on save with Prettier
- ESLint auto-fix on save
- Unused import removal
- File associations for `.template` files
- Spell check for GenSX-specific terms

### Cursor Rules Standards

- Cursor rule files (.mdc) must be placed in `.cursor/rules/` directory
- Use kebab-case naming convention
- Never place rule files in project root or other locations

### Editor Integration

- **Format on save** enabled
- **ESLint validation** for JS/TS/JSX/TSX files
- **Auto-fix imports** and remove unused imports
- **Prettier** as default formatter

## Chrome Extension Development

### Extension Structure (`/extensions/chrome-copilot/`)

```bash
# Start GenSX workflow server
pnpm dev

# Build extension for development
pnpm build:dev

# Build for production
pnpm build

# Create distribution package
pnpm package

# Type checking
pnpm type-check
```

**Architecture:**

- TypeScript source in `src/` directory
- Webpack bundling with Chrome extension support
- GenSX workflows in `gensx/` directory
- Built files output to `dist/` directory

## Important Workflow Reminders

- **ALWAYS run `pnpm lint:fix` after making code changes**
- Test changes thoroughly before committing
- Update relevant documentation when modifying APIs
- Follow the established component and workflow patterns
- Use proper TypeScript typing throughout
- Place files in correct directories (especially Cursor rules)
- Build and test before creating pull requests

## Key Directories to Understand

- `/packages/gensx-core/` - Core framework implementation
- `/packages/gensx/` - CLI tool and development server
- `/examples/` - Working examples of framework usage
- `/website/docs/` - Documentation source
- `/extensions/chrome-copilot/` - Chrome extension implementation
