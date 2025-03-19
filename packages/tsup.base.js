/**
 * Base tsup configuration for GenSX packages
 * Supports both ESM and CommonJS outputs
 */

// Use this in package tsup.config.ts with:
// import { createTsupConfig } from '../tsup.base.js';
// export default createTsupConfig(['src/index.ts', 'src/other-entry.ts']);

export function createTsupConfig(entries) {
  return [
    // ESM Build
    {
      entry: entries,
      format: ['esm'],
      dts: true,
      sourcemap: true,
      clean: true,
      outDir: 'dist/esm',
      esbuildOptions(options) {
        options.conditions = ['module', 'import'];
        options.platform = 'node';
        options.keepNames = true;
      },
    },
    // CJS Build
    {
      entry: entries,
      format: ['cjs'],
      sourcemap: true,
      outDir: 'dist/cjs',
      esbuildOptions(options) {
        options.conditions = ['require'];
        options.platform = 'node';
        options.keepNames = true;
      },
      // Handle ESM dependencies properly
      noExternal: ['serialize-error'],
      // Bundle mode to properly include ESM dependencies
      treeshake: true,
    },
    // Type definitions (only need to generate once)
    {
      entry: entries,
      format: ['esm'],
      dts: {
        only: true,
      },
      sourcemap: true,
      outDir: 'dist',
      clean: false,
    },
  ];
}