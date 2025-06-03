# CommonJS Compatibility Example

This example demonstrates how to use GenSX with projects that compile to the CommonJS module format. It also provides a "pure" CommonJS script that uses `require`.

## The Example

TypeScript is configured to emit CommonJS modules. `index.ts` defines a simple workflow using the new programming model, while `pure-commonjs.js` shows how to use GenSX directly from a CommonJS script.

## Running the TypeScript version

```bash
pnpm start:ts
```

## Running the pure CommonJS version

```bash
pnpm start:pure
```
