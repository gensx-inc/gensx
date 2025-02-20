# create-gensx

Create a new [GenSX](https://gensx.com) project with one command.

## Usage

```bash
# Using npm
npm create gensx@latest my-app

# Using npx
npx create-gensx@latest my-app

# Using yarn
yarn create gensx my-app

# Using pnpm
pnpm create gensx my-app
```

### Options

```bash
# Use a specific template (default: ts)
npm create gensx@latest my-app --template ts

# Force creation in non-empty directory
npm create gensx@latest my-app --force
```

## Templates

### TypeScript (ts)

A TypeScript-based project configured with:

- TypeScript configuration for GenSX
- Basic project structure
- Development server with hot reload
- Build setup

## Development

```bash
# Build the package
pnpm run build

# Run tests
pnpm test
```
