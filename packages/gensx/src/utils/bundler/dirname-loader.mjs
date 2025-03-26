import { createRequire } from "module";

// Set a fixed __dirname for all modules
globalThis.__dirname = "/runner/user";

// Polyfill require for ES modules
globalThis.require = createRequire(import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  // Only transform ES modules
  if (result.format === "module") {
    const source = result.source;
    // We don't need to modify the source since we've set __dirname globally
    return {
      format: "module",
      source,
      shortCircuit: true,
    };
  }
  return result;
}
