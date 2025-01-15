# GenSX Monorepo

This monorepo contains GenSX and its related packages - a framework for building LLM workflows and AI agents with JSX on the backend. Every GenSX component is a pure function, making it easily shareable by default.

## Repository Structure

- `packages/` - Published packages
- `examples/` - Example applications and use cases
- `docs` - `https://gensx.dev` Documentation

## Prerequisites

- Node.js (LTS version recommended)
- pnpm (v9.12.2 or later)

## Documentation

For detailed documentation about GenSX, please refer check out the [docs](https://gensx.dev).

## Getting Started

1. Install dependencies:

```bash
pnpm install
```

2. Build all packages:

```bash
pnpm build:all
```

## Run an example

```bash
OPENAI_API_KEY=<my api key> turbo run run --filter="./examples/blogWriter"
```

## License

Apache 2.0
