# GenSX Development Guide

## Build/Test/Lint Commands

- `pnpm build` - Build all packages
- `pnpm dev` - Watch and build packages
- `pnpm test` - Run tests for all packages
- `pnpm test -- -t "test name"` - Run specific test
- `pnpm lint` - Run linter
- `pnpm lint:fix` - Fix linting issues (ALWAYS run after making code changes)
- `pnpm format` - Format code with prettier

## Important Workflow Reminders

- ALWAYS run `pnpm lint:fix` after making code changes
- Test changes thoroughly before committing
- Update relevant documentation when modifying APIs

## Code Style Guidelines

- Use **TypeScript** with strict typing, do not use `any` types
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Imports**: Use explicit imports, follow `simple-import-sort` rules
- **JSX**: All components should use JSX syntax with @gensx/core as jsxImportSource
- **Error handling**: Use try/catch with specific error types
- **Async/Await**: Always use async/await for promises
- **Components**: Prefer functional components with clear props interfaces
- **Testing**: Every package should have tests in its tests/ directory

## Project Structure

- monorepo with pnpm workspaces
- Packages in packages/ directory
- Examples in examples/ directory
