/**
 * GenSX SDK - TypeScript SDK for GenSX workflow interactions
 *
 * This SDK provides a clean interface for interacting with GenSX workflows,
 * including both streaming and async execution patterns.
 */

// Main SDK export
export { GenSX } from './sdk.js';

// Type exports
export type {
  GenSXConfig,
  RunRawOptions,
  StartOptions,
  StartResponse,
  GetProgressOptions,
  GenSXEvent,
  GenSXStartEvent,
  GenSXComponentStartEvent,
  GenSXComponentEndEvent,
  GenSXProgressEvent,
  GenSXOutputEvent,
  GenSXEndEvent,
  GenSXErrorEvent,
} from './sdk.js';

// Default export
export { GenSX as default } from './sdk.js';
