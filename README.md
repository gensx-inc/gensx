# GenSX Monorepo

This monorepo contains GenSX and its related packages - a framework for building LLM workflows and AI agents with JSX on the backend. Every GenSX component is a pure function, making it easily shareable by default.

## Repository Structure

- `packages/`
  - `gensx/` - Core GenSX package
  - `gensx-openai/` - OpenAI integration for GenSX
- `examples/` - Example applications and use cases
  - `blogWriter/` - Blog writing workflow example
  - `hackerNewsAnalyzer/` - HackerNews analysis example
  - `streaming/` - Streaming capabilities demo

## Prerequisites

- Node.js (LTS version recommended)
- pnpm (v9.12.2 or later)

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Build all packages:

```bash
pnpm build:all
```

3. Run tests:

```bash
pnpm test:all
```

## Available Commands

- `pnpm build` - Build core packages
- `pnpm build:examples` - Build example projects
- `pnpm build:all` - Build everything
- `pnpm dev` - Start development mode for core packages
- `pnpm lint` - Lint core packages
- `pnpm lint:examples` - Lint example projects
- `pnpm lint:fix` - Fix linting issues in core packages
- `pnpm test` - Run tests for core packages
- `pnpm clean` - Clean build artifacts

## Documentation

For detailed documentation about GenSX, please refer to the [GenSX package README](packages/gensx/README.md).

## License

Apache 2.0
