# Contributing

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

## ⚙️ Developing the library

We have good integration with VSCode, so while editing you will have the ability to run the tests and all code should be linted and formatted automatically, as long the recommended extensions are installed.

### Install dependencies

```bash
pnpm install
```

### Making changes to a package

`pnpm dev` from the package directory will continuously watch for changes and rebuild that specific package.

`pnpm dev` from the root directory will build and watch all core packages.

`pnpm test:watch` from a package directory will run the tests and watch for changes.

`pnpm test:watch` from the root directory will run the tests and watch for changes in all core packages.

Use the command that best suits your needs.

#### `create-gensx` Tests

The `create-gensx` tests require an `OPENAI_API_KEY` environment variable to be set.

### Making changes to an example

You need to run `pnpm dev` from the root directory to ensure that all packages are built and available.

You can run `pnpm dev` from the example directory to watch for changes and rerun that specific example. Be careful with this, as it will rerun the example for every change, and this can be slow/costly for examples that hit OpenAI.

### 💅 Linting

To run the linter you can execute:

```bash
pnpm lint
```

And for trying to fix lint issues automatically, you can run:

```bash
pnpm lint:fix
```

To ensure formatting is correct, you can run:

```bash
pnpm format
```
