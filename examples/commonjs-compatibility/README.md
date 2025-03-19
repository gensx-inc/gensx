# CommonJS Compatibility Example

This example demonstrates how to use GenSX packages with CommonJS modules. It shows that GenSX packages support both ESM (the default) and CommonJS format.

## The Example

This example has typescript configured with `moduleResolution: "Node"` and `module: "esnext"`. It also has a `js` file that uses the `require` syntax to import the GenSX packages.

This demonstrates usage of the GenSX packages in a CommonJS environment.

## Running the typescript example

```bash
pnpm start:ts
```

## Running the pure CommonJS example

```bash
pnpm start:pure
```
