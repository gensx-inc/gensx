import { defineConfig } from 'tsup';
import { createTsupConfig } from '../tsup.base.js';

export default defineConfig(
  createTsupConfig([
    'src/index.ts',
    'src/jsx-runtime.ts',
    'src/jsx-dev-runtime.ts',
  ])
);