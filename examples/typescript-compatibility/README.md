# Typescript Compatibility Example

This example shows that GenSX works even with older TypeScript settings like `moduleResolution: "node"` and `target: "es5"`.

`index.ts` defines a simple workflow using the new programming model. It compiles to CommonJS so it can run in environments that don't support ESM.

## Running the example

```bash
pnpm start
```
