# CommonJS Compatibility Example

This example demonstrates how to use GenSX packages with CommonJS modules. It shows that GenSX packages support both ESM (the default) and CommonJS format.

## How it works

The GenSX packages have been built with dual module format support:
1. ESM output in `dist/esm/*.js` 
2. CommonJS output in `dist/cjs/*.cjs`

The package.json has been configured with the following fields:
```json
{
  "type": "module",
  "main": "./dist/cjs/index.cjs",  // For CommonJS consumers
  "module": "./dist/esm/index.js",  // For ESM consumers
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.cjs"
    }
  }
}
```

This allows both ESM and CommonJS projects to use GenSX packages with their native module system.

## The Example

This example uses pure CommonJS (`require()`) syntax to import and use GenSX packages in a CommonJS environment. It validates that our packages correctly support dual module usage by:

1. Importing GenSX packages using CommonJS syntax
2. Creating and running a simple workflow
3. Verifying that it works without any ESM/CommonJS compatibility errors

## Running the example

Run the pure CommonJS example with:

```bash
node pure-commonjs.js
```

Or use the npm script:

```bash
pnpm start:pure
```

## Validation

When running the example, you should see:

```
Module type: CommonJS
=== Running Pure CommonJS Example ===
Result: This is a simple CommonJS component that demonstrates the dual package support!

Successfully used GenSX packages in CommonJS mode!
This verifies that the dual ESM/CommonJS package support is working correctly.
```

This confirms that the GenSX packages work properly with CommonJS modules.